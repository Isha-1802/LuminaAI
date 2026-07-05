"""Stats routes."""
from fastapi import APIRouter, Depends
from core import db, get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/summary")
async def stats_summary(user: dict = Depends(get_current_user)):
    total = await db.interviews.count_documents({"user_id": user["user_id"]})
    completed_cursor = db.interviews.find(
        {"user_id": user["user_id"], "status": "completed"},
        {"_id": 0, "score": 1, "interview_type": 1},
    )
    scores = []
    by_type = {}
    async for d in completed_cursor:
        if isinstance(d.get("score"), (int, float)):
            scores.append(d["score"])
        t = d.get("interview_type", "unknown")
        by_type[t] = by_type.get(t, 0) + 1
    avg = round(sum(scores) / len(scores), 1) if scores else 0
    best = max(scores) if scores else 0
    return {
        "total_interviews": total,
        "completed": len(scores),
        "average_score": avg,
        "best_score": best,
        "by_type": by_type,
    }
