"""Daily question — answer one interview question a day to keep the streak alive.

Questions are drawn by spaced repetition from the questions this candidate has
actually struggled on, so the streak hunts real weaknesses instead of random topics.
"""
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Body

from core import db, get_current_user, now_iso, llm_chat, safe_json

router = APIRouter(prefix="/api/daily", tags=["daily"])

# Spaced-repetition ladder: a weak question resurfaces after 3 days, then 7, then 21.
REPETITION_DAYS = [3, 7, 21]

TOPICS = [
    "data structures", "algorithms", "system design", "databases", "REST API design",
    "debugging", "object-oriented design", "concurrency", "behavioral — ownership",
    "behavioral — conflict", "behavioral — failure", "web fundamentals", "testing",
]
DIFFICULTIES = ["easy", "medium", "hard"]


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


async def _due_weak_question(user_id: str):
    """Pick the highest-priority weak question that is due for review today.

    Draws from questions flagged 'struggled' (then 'adequate') in past interview
    reports, and only resurfaces one once its spaced-repetition interval has elapsed.
    """
    interviews = await db.interviews.find(
        {"user_id": user_id, "status": "completed", "feedback.question_analysis": {"$exists": True}},
        {"_id": 0, "interview_id": 1, "role_title": 1, "interview_type": 1,
         "difficulty": 1, "completed_at": 1, "feedback.question_analysis": 1},
    ).sort("completed_at", -1).to_list(50)

    # How many times each question has already been reviewed, and when last seen
    reviews = await db.daily_questions.find(
        {"user_id": user_id, "source": "weak_question"},
        {"_id": 0, "origin_key": 1, "date": 1},
    ).to_list(500)
    seen: dict = {}
    for r in reviews:
        key = r.get("origin_key")
        if not key:
            continue
        entry = seen.setdefault(key, {"count": 0, "last": ""})
        entry["count"] += 1
        entry["last"] = max(entry["last"], r.get("date", ""))

    today = datetime.now(timezone.utc).date()
    candidates = []
    for iv in interviews:
        qa = (iv.get("feedback") or {}).get("question_analysis") or []
        for idx, q in enumerate(qa):
            verdict = q.get("verdict")
            if verdict not in ("struggled", "adequate"):
                continue
            key = f"{iv['interview_id']}#{idx}"
            info = seen.get(key)
            reps = info["count"] if info else 0
            if reps >= len(REPETITION_DAYS):
                continue  # graduated — mastered through repeated review
            if info:
                try:
                    last = datetime.fromisoformat(info["last"]).date()
                except ValueError:
                    continue
                # reps reviews done -> the wait before the next one is REPETITION_DAYS[reps - 1]
                if (today - last).days < REPETITION_DAYS[reps - 1]:
                    continue  # not due yet
            candidates.append({
                "origin_key": key,
                "question": q.get("question"),
                "note": q.get("note"),
                "verdict": verdict,
                "reps": reps,
                "role_title": iv.get("role_title"),
                "interview_type": iv.get("interview_type"),
                "difficulty": iv.get("difficulty", "medium"),
            })

    if not candidates:
        return None
    # Struggled outranks adequate; among equals, revisit the least-reviewed first
    candidates.sort(key=lambda c: (c["verdict"] != "struggled", c["reps"]))
    return candidates[0]


@router.get("/question")
async def get_daily_question(user: dict = Depends(get_current_user)):
    """Today's question for this user — generated once per day, then cached."""
    day = _today()
    doc = await db.daily_questions.find_one(
        {"user_id": user["user_id"], "date": day}, {"_id": 0}
    )
    if doc:
        return doc

    weak = await _due_weak_question(user["user_id"])
    if weak:
        # Resurface a question they previously struggled on
        doc = {
            "user_id": user["user_id"],
            "date": day,
            "topic": weak["role_title"] or weak["interview_type"] or "review",
            "difficulty": weak["difficulty"],
            "question": weak["question"],
            "source": "weak_question",
            "origin_key": weak["origin_key"],
            "review_round": weak["reps"] + 1,
            "prior_note": weak["note"],
            "answered": False,
            "created_at": now_iso(),
        }
    else:
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
            "source": "generated",
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

    # If this is a resurfaced weak question, tell the evaluator what went wrong last time
    review_block = ""
    if doc.get("source") == "weak_question" and doc.get("prior_note"):
        review_block = (
            f"\nThis is a REVIEW (round {doc.get('review_round', 1)}). Last time they were weak here: "
            f"\"{doc['prior_note']}\". Say explicitly whether they have improved on that specific gap.\n"
        )

    raw = await llm_chat(
        "llama-3.3-70b-versatile",
        f"daily-eval-{user['user_id']}-{day}",
        "You output strict JSON only. Never include prose outside JSON.",
        (
            "Evaluate this interview answer. Produce STRICT JSON exactly:\n"
            '{"verdict": "nailed_it" | "solid" | "needs_work", "feedback": "<2 encouraging but honest sentences: what worked, what to sharpen>"}\n\n'
            f"QUESTION ({doc['difficulty']}, {doc['topic']}): {doc['question']}\n"
            f"{review_block}\n"
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
