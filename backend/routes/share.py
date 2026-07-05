"""Public share links for interview reports."""
import uuid
from fastapi import APIRouter, HTTPException, Depends

from core import db, get_current_user, now_iso, InterviewNoteInput

router = APIRouter(prefix="/api", tags=["share"])


@router.post("/interviews/{interview_id}/share")
async def create_share(interview_id: str, user: dict = Depends(get_current_user)):
    """Owner enables a public share link for a completed interview. Returns share_token."""
    doc = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    token = doc.get("share_token") or f"shr_{uuid.uuid4().hex[:16]}"
    await db.interviews.update_one(
        {"interview_id": interview_id},
        {"$set": {"share_token": token, "shared_at": now_iso()}},
    )
    return {"share_token": token}


@router.delete("/interviews/{interview_id}/share")
async def revoke_share(interview_id: str, user: dict = Depends(get_current_user)):
    await db.interviews.update_one(
        {"interview_id": interview_id, "user_id": user["user_id"]},
        {"$unset": {"share_token": "", "shared_at": ""}},
    )
    return {"ok": True}


@router.get("/share/{token}")
async def read_shared(token: str):
    """PUBLIC — no auth required. Returns stripped-down report."""
    doc = await db.interviews.find_one(
        {"share_token": token},
        {"_id": 0, "system_prompt": 0, "user_id": 0, "recording": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Share not found")
    # Also fetch the candidate's name (public-safe)
    return {
        "role_title": doc.get("role_title"),
        "interview_type": doc.get("interview_type"),
        "difficulty": doc.get("difficulty"),
        "atelier_id": doc.get("atelier_id"),
        "num_questions": doc.get("num_questions"),
        "panel_config": doc.get("panel_config"),
        "status": doc.get("status"),
        "feedback": doc.get("feedback"),
        "score": doc.get("score"),
        "messages": doc.get("messages", []),
        "created_at": doc.get("created_at"),
        "completed_at": doc.get("completed_at"),
        "share_token": token,
    }


@router.post("/share/{token}/note")
async def add_interviewer_note(token: str, payload: InterviewNoteInput, user: dict = Depends(get_current_user)):
    """Interviewer adds a private note + verdict to a shared report. Stored in reviewer_notes collection."""
    interview = await db.interviews.find_one({"share_token": token}, {"_id": 0, "interview_id": 1, "role_title": 1, "user_id": 1})
    if not interview:
        raise HTTPException(status_code=404, detail="Share not found")
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    doc = {
        "note_id": note_id,
        "interview_id": interview["interview_id"],
        "reviewer_user_id": user["user_id"],
        "reviewer_name": user.get("name"),
        "verdict": payload.verdict,
        "note": payload.note,
        "candidate_user_id": interview["user_id"],
        "role_title": interview["role_title"],
        "created_at": now_iso(),
    }
    await db.reviewer_notes.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.get("/reviews/inbox")
async def reviewer_inbox(user: dict = Depends(get_current_user)):
    """Interviewer's own note history — a running feed of reviewed candidates."""
    docs = await db.reviewer_notes.find(
        {"reviewer_user_id": user["user_id"]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    return docs
