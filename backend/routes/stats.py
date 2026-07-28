"""Stats routes."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from core import (
    db, get_current_user, require_interviewer,
    compute_monetization_tier, MONETIZATION_TIERS,
)

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/interviewer")
async def interviewer_stats(user: dict = Depends(require_interviewer)):
    """Dashboard metrics for an interviewer: sessions, rating, earnings, tier, reviews."""
    uid = user["user_id"]

    bookings = await db.bookings.find(
        {"interviewer_id": uid},
        {"_id": 0, "status": 1, "start_time": 1, "candidate_name": 1, "updated_at": 1},
    ).to_list(1000)
    completed = [b for b in bookings if b.get("status") == "completed"]
    upcoming = [b for b in bookings if b.get("status") == "scheduled"]

    reviews = await db.reviews.find(
        {"interviewer_id": uid},
        {"_id": 0, "rating": 1, "comment": 1, "candidate_name": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(500)

    ratings = [r["rating"] for r in reviews if isinstance(r.get("rating"), (int, float))]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0
    breakdown = {star: sum(1 for r in ratings if r == star) for star in range(1, 6)}

    tier = compute_monetization_tier(len(completed), avg_rating)
    rate = tier["rate_inr"]
    earnings = len(completed) * rate  # platform pays the tier rate per completed interview

    # Progress toward the next tier
    idx = next((i for i, t in enumerate(MONETIZATION_TIERS) if t["tier"] == tier["tier"]), 0)
    next_tier = MONETIZATION_TIERS[idx + 1] if idx + 1 < len(MONETIZATION_TIERS) else None
    to_next = None
    if next_tier:
        to_next = {
            "tier": next_tier["tier"],
            "interviews_needed": max(0, next_tier["min_interviews"] - len(completed)),
            "rating_needed": next_tier["min_rating"],
            "rate_inr": next_tier["rate_inr"],
        }

    return {
        "completed": len(completed),
        "upcoming": len(upcoming),
        "total_bookings": len(bookings),
        "avg_rating": avg_rating,
        "review_count": len(reviews),
        "rating_breakdown": breakdown,
        "is_available": bool(user.get("is_available")),
        "tier": {
            "name": tier["tier"], "rate_inr": rate, "is_monetized": tier["is_monetized"],
            "color": tier["color"], "description": tier["description"],
        },
        "estimated_earnings_inr": earnings,
        "next_tier": to_next,
        "recent_reviews": reviews[:5],
    }

HEATMAP_AXES = ["communication", "problem_solving", "technical_depth", "confidence", "leadership", "system_design"]
WEAK_THRESHOLD = 60

AXIS_SUGGESTIONS = {
    "communication": "Practice structuring answers with STAR; record yourself and cut filler words.",
    "problem_solving": "Do timed problem walkthroughs — narrate your reasoning out loud before coding.",
    "technical_depth": "Pick one weak topic per week and do a deep-dive rehearsal on it.",
    "confidence": "Rehearse your opening 30 seconds; slower pace and fewer hedges read as confidence.",
    "leadership": "Prepare 3 ownership stories — conflict, initiative, and failure — with clear outcomes.",
    "system_design": "Run design-focused rehearsals; practice stating tradeoffs before deciding.",
}


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


@router.get("/activity")
async def stats_activity(user: dict = Depends(get_current_user)):
    """Daily practice activity for the calendar heatmap + streaks.

    A day counts as practiced if the user did an interview OR answered
    the daily question.
    """
    docs = await db.interviews.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "created_at": 1},
    ).to_list(2000)

    counts: dict = {}
    for d in docs:
        day = (d.get("created_at") or "")[:10]
        if day:
            counts[day] = counts.get(day, 0) + 1

    daily_docs = await db.daily_questions.find(
        {"user_id": user["user_id"], "answered": True},
        {"_id": 0, "date": 1},
    ).to_list(2000)
    for d in daily_docs:
        day = d.get("date")
        if day:
            counts[day] = counts.get(day, 0) + 1

    today = datetime.now(timezone.utc).date()
    window_days = 119  # 17 weeks
    days = []
    for i in range(window_days - 1, -1, -1):
        dt = today - timedelta(days=i)
        iso = dt.isoformat()
        days.append({"date": iso, "count": counts.get(iso, 0)})

    # Current streak: consecutive practice days ending today (or yesterday,
    # so the streak isn't "broken" before the day is over).
    anchor = today if counts.get(today.isoformat()) else today - timedelta(days=1)
    current_streak = 0
    d = anchor
    while counts.get(d.isoformat(), 0) > 0:
        current_streak += 1
        d -= timedelta(days=1)

    # Longest streak across all history
    longest_streak = 0
    run = 0
    prev = None
    for iso in sorted(counts.keys()):
        cur = datetime.fromisoformat(iso).date()
        run = run + 1 if (prev and (cur - prev).days == 1) else 1
        longest_streak = max(longest_streak, run)
        prev = cur

    return {
        "days": days,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "active_days": sum(1 for day in days if day["count"] > 0),
        "total_sessions": sum(day["count"] for day in days),
    }


def _axis_values(docs: list, axis: str) -> list:
    vals = []
    for d in docs:
        v = ((d.get("feedback") or {}).get("heatmap") or {}).get(axis)
        if isinstance(v, (int, float)):
            vals.append(v)
    return vals


def _avg(vals: list):
    return round(sum(vals) / len(vals), 1) if vals else None


@router.get("/analytics")
async def stats_analytics(user: dict = Depends(get_current_user)):
    """Progress analytics: score timeline, skill trends, weak areas, platform benchmarks."""
    docs = await db.interviews.find(
        {"user_id": user["user_id"], "status": "completed"},
        {"_id": 0, "interview_id": 1, "score": 1, "interview_type": 1, "difficulty": 1,
         "role_title": 1, "completed_at": 1, "created_at": 1, "feedback.heatmap": 1},
    ).sort("completed_at", 1).to_list(500)

    scored = [d for d in docs if isinstance(d.get("score"), (int, float))]

    # --- Score timeline ---
    timeline = [
        {
            "interview_id": d["interview_id"],
            "date": d.get("completed_at") or d.get("created_at"),
            "score": d["score"],
            "interview_type": d.get("interview_type"),
            "difficulty": d.get("difficulty"),
            "role_title": d.get("role_title"),
        }
        for d in scored
    ]

    # --- Improvement trend: last 5 vs the 5 before ---
    recent = [d["score"] for d in scored[-5:]]
    earlier = [d["score"] for d in scored[-10:-5]]
    trend_delta = None
    if recent and earlier:
        trend_delta = round(sum(recent) / len(recent) - sum(earlier) / len(earlier), 1)

    # --- Skill averages + per-skill trend (recent half vs earlier half) ---
    half = len(docs) // 2
    skills = {}
    for axis in HEATMAP_AXES:
        all_vals = _axis_values(docs, axis)
        early_vals = _axis_values(docs[:half], axis) if half else []
        late_vals = _axis_values(docs[half:], axis)
        avg_v = _avg(all_vals)
        delta = None
        if early_vals and late_vals:
            delta = round((sum(late_vals) / len(late_vals)) - (sum(early_vals) / len(early_vals)), 1)
        skills[axis] = {"average": avg_v, "delta": delta, "samples": len(all_vals)}

    # --- Weak areas: lowest axes under threshold ---
    weak_areas = sorted(
        (
            {"axis": axis, "average": s["average"], "delta": s["delta"], "suggestion": AXIS_SUGGESTIONS[axis]}
            for axis, s in skills.items()
            if s["average"] is not None and s["average"] < WEAK_THRESHOLD
        ),
        key=lambda w: w["average"],
    )

    # --- Per-type performance ---
    by_type = {}
    for d in scored:
        t = d.get("interview_type", "unknown")
        by_type.setdefault(t, []).append(d["score"])
    type_performance = {t: {"average": _avg(v), "count": len(v)} for t, v in by_type.items()}

    # --- Platform benchmarks (all users) ---
    pipeline = [
        {"$match": {"status": "completed", "score": {"$type": "number"}}},
        {"$group": {
            "_id": None,
            "avg_score": {"$avg": "$score"},
            "count": {"$sum": 1},
            **{f"avg_{a}": {"$avg": f"$feedback.heatmap.{a}"} for a in HEATMAP_AXES},
        }},
    ]
    bench_rows = await db.interviews.aggregate(pipeline).to_list(1)
    benchmarks = None
    if bench_rows:
        row = bench_rows[0]
        benchmarks = {
            "average_score": round(row["avg_score"], 1),
            "sample_size": row["count"],
            "skills": {a: (round(row[f"avg_{a}"], 1) if row.get(f"avg_{a}") is not None else None) for a in HEATMAP_AXES},
        }

    user_avg = _avg([d["score"] for d in scored])
    return {
        "timeline": timeline,
        "trend_delta": trend_delta,
        "average_score": user_avg,
        "skills": skills,
        "weak_areas": weak_areas,
        "type_performance": type_performance,
        "benchmarks": benchmarks,
    }
