import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body

from core import db, get_current_user, strip_mongo, now_iso, llm_chat

logger = logging.getLogger("lumina.chat")
router = APIRouter(prefix="/api/chat", tags=["Chat"])


async def _coach_context(user: dict) -> str:
    """Summarize the candidate's recent rehearsals + feedback for the coach's system prompt."""
    docs = await db.interviews.find(
        {"user_id": user["user_id"], "status": "completed"},
        {"_id": 0, "role_title": 1, "interview_type": 1, "difficulty": 1, "score": 1,
         "completed_at": 1, "feedback.summary": 1, "feedback.improvements": 1,
         "feedback.heatmap": 1, "feedback.action_items": 1},
    ).sort("completed_at", -1).to_list(10)

    if not docs:
        return "The candidate has not completed any practice interviews yet."

    lines = []
    for d in docs:
        fb = d.get("feedback") or {}
        lines.append(
            f"- {d.get('role_title')} ({d.get('interview_type')}, {d.get('difficulty')}): scored {d.get('score')}/100. "
            f"Summary: {fb.get('summary', '—')} "
            f"Improvements flagged: {'; '.join(fb.get('improvements') or []) or '—'}"
        )
    return "Recent interviews (newest first):\n" + "\n".join(lines)


@router.get("/coach/history")
async def coach_history(user: dict = Depends(get_current_user)):
    """List the candidate's past coach conversations, newest first."""
    docs = await db.coach_chats.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "chat_id": 1, "title": 1, "updated_at": 1, "created_at": 1},
    ).sort("updated_at", -1).to_list(30)
    return docs


@router.get("/coach/history/{chat_id}")
async def coach_chat_detail(chat_id: str, user: dict = Depends(get_current_user)):
    """Full message log of one past coach conversation."""
    doc = await db.coach_chats.find_one(
        {"chat_id": chat_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return doc


@router.post("/coach")
async def coach_message(payload: dict = Body(...), user: dict = Depends(get_current_user)):
    """Lumina Coach — a chat assistant grounded in the candidate's own interview history.

    Threads are persisted server-side: pass no chat_id to start a new conversation,
    or an existing chat_id to continue one.
    """
    content = ((payload or {}).get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Empty message")

    chat_id = (payload or {}).get("chat_id")
    chat = None
    if chat_id:
        chat = await db.coach_chats.find_one({"chat_id": chat_id, "user_id": user["user_id"]}, {"_id": 0})
    if not chat:
        chat_id = f"coach_{uuid.uuid4().hex[:12]}"
        chat = {
            "chat_id": chat_id,
            "user_id": user["user_id"],
            "title": content[:60],
            "messages": [],
            "created_at": now_iso(),
        }
        await db.coach_chats.insert_one(dict(chat))

    messages = chat["messages"] + [{"role": "user", "content": content, "ts": now_iso()}]

    context = await _coach_context(user)
    system_prompt = (
        "You are Lumina Coach, a sharp, warm, genuinely helpful AI assistant inside the Lumina practice platform. "
        f"You are talking to {user.get('name') or 'a candidate'}.\n\n"
        f"WHAT YOU KNOW ABOUT THEIR PRACTICE HISTORY:\n{context}\n\n"
        "You are a general-purpose assistant — answer ANY question they ask, on any subject, "
        "the way ChatGPT or Claude would: coding help, debugging, explaining concepts, writing, math, "
        "study plans, career and salary questions, or just thinking something through. Never refuse a "
        "topic for being 'off-topic' and never steer the conversation back to interviews unprompted.\n\n"
        "Your edge is that you also know their interview history above. When a question touches their "
        "practice, performance, or preparation, ground your answer in those real scores and flagged "
        "weaknesses and quote specifics.\n\n"
        "Style:\n"
        "- Be concrete and useful: real examples, working code, specific drills — never vague filler.\n"
        "- Default to under 250 words with short paragraphs or tight bullets; go longer only when the "
        "question genuinely needs it (e.g. code walkthroughs or step-by-step explanations).\n"
        "- Use fenced code blocks for code.\n"
        "- If you don't know something or lack context, say so plainly instead of inventing it."
    )

    # Fold prior turns into one transcript for the single-turn LLM helper
    convo = "\n\n".join(
        f"{'Candidate' if m.get('role') == 'user' else 'Coach'}: {m.get('content', '')}"
        for m in messages[-12:]
    )
    reply = await llm_chat(
        "llama-3.3-70b-versatile",
        f"coach-{user['user_id']}",
        system_prompt,
        f"Conversation so far:\n\n{convo}\n\nCoach:",
    )
    reply = reply.strip()

    messages.append({"role": "assistant", "content": reply, "ts": now_iso()})
    await db.coach_chats.update_one(
        {"chat_id": chat_id},
        {"$set": {"messages": messages, "updated_at": now_iso()}},
    )
    return {"chat_id": chat_id, "reply": reply}

@router.get("/{booking_id}")
async def get_messages(booking_id: str, user: dict = Depends(get_current_user)):
    """Get all messages for a specific booking."""
    booking = await db.bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking["candidate_id"] != user["user_id"] and booking["interviewer_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to view these messages")
        
    cursor = db.messages.find({"booking_id": booking_id}).sort("created_at", 1)
    messages = await cursor.to_list(length=200)
    
    return [strip_mongo(m) for m in messages]


@router.post("/{booking_id}")
async def send_message(
    booking_id: str, 
    content: str = Body(..., embed=True), 
    user: dict = Depends(get_current_user)
):
    """Send a message to a booking thread."""
    booking = await db.bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking["candidate_id"] != user["user_id"] and booking["interviewer_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to post messages here")
        
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "booking_id": booking_id,
        "sender_id": user["user_id"],
        "sender_name": user.get("name"),
        "sender_role": user.get("role"),
        "content": content,
        "created_at": now_iso()
    }
    
    await db.messages.insert_one(message)
    return strip_mongo(message)
