"""Daily question — answer one interview question a day to keep the streak alive."""
import random
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Body

from core import db, get_current_user, now_iso, llm_chat, safe_json

router = APIRouter(prefix="/api/daily", tags=["daily"])

TOPICS = [
    "data structures", "algorithms", "system design", "databases", "REST API design",
    "debugging", "object-oriented design", "concurrency", "behavioral — ownership",
    "behavioral — conflict", "behavioral — failure", "web fundamentals", "testing",
]
DIFFICULTIES = ["easy", "medium", "hard"]


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


@router.get("/question")
async def get_daily_question(user: dict = Depends(get_current_user)):
    """Today's question for this user — generated once per day, then cached."""
    day = _today()
    doc = await db.daily_questions.find_one(
        {"user_id": user["user_id"], "date": day}, {"_id": 0}
    )
    if doc:
        return doc

    difficulty = random.choice(DIFFICULTIES)
    topic = random.choice(TOPICS)
    question = await llm_chat(
        "llama-3.3-70b-versatile",
        f"daily-{user['user_id']}-{day}",
        "You write one single interview question. Output ONLY the question text — no preamble, no numbering, no answer.",
        f"Write one {difficulty} interview question about {topic}. It must be answerable in 3-6 sentences of plain text (no code required).",
    )
    doc = {
        "user_id": user["user_id"],
        "date": day,
        "topic": topic,
        "difficulty": difficulty,
        "question": question.strip(),
        "answered": False,
        "created_at": now_iso(),
    }
    await db.daily_questions.insert_one(dict(doc))
    doc.pop("user_id", None)
    return doc


@router.post("/answer")
async def answer_daily_question(payload: dict = Body(...), user: dict = Depends(get_current_user)):
    """Submit today's answer — quick AI verdict, and the day counts toward the streak."""
    answer = ((payload or {}).get("answer") or "").strip()
    if len(answer) < 20:
        raise HTTPException(status_code=400, detail="Give it a real attempt — at least a few sentences.")

    day = _today()
    doc = await db.daily_questions.find_one({"user_id": user["user_id"], "date": day})
    if not doc:
        raise HTTPException(status_code=404, detail="No question issued today — fetch it first")
    if doc.get("answered"):
        return {"already_done": True, "verdict": doc.get("verdict"), "feedback": doc.get("feedback")}

    raw = await llm_chat(
        "llama-3.3-70b-versatile",
        f"daily-eval-{user['user_id']}-{day}",
        "You output strict JSON only. Never include prose outside JSON.",
        (
            "Evaluate this interview answer. Produce STRICT JSON exactly:\n"
            '{"verdict": "nailed_it" | "solid" | "needs_work", "feedback": "<2 encouraging but honest sentences: what worked, what to sharpen>"}\n\n'
            f"QUESTION ({doc['difficulty']}, {doc['topic']}): {doc['question']}\n\n"
            f"ANSWER: {answer[:3000]}\n\nReturn ONLY valid JSON."
        ),
    )
    result = safe_json(raw) or {"verdict": "solid", "feedback": "Answer recorded — evaluation was unavailable, but your streak is safe."}

    await db.daily_questions.update_one(
        {"user_id": user["user_id"], "date": day},
        {"$set": {
            "answered": True,
            "answer": answer,
            "verdict": result.get("verdict"),
            "feedback": result.get("feedback"),
            "answered_at": now_iso(),
        }},
    )
    return {"already_done": False, "verdict": result.get("verdict"), "feedback": result.get("feedback")}
