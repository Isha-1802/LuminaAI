import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException

from core import db, get_current_user, strip_mongo, now_iso, ReviewInput, compute_monetization_tier

logger = logging.getLogger("lumina.reviews")
router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.post("/")
async def submit_review(review: ReviewInput, user: dict = Depends(get_current_user)):
    """Candidate submits a review for an interviewer after a completed booking."""
    if user.get("role") != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can leave reviews")

    # Validate booking exists, is completed, and belongs to this candidate
    booking = await db.bookings.find_one({"booking_id": review.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["candidate_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only review your own interviews")
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Interview must be completed before leaving a review")

    # Prevent duplicate reviews
    existing = await db.reviews.find_one({"booking_id": review.booking_id, "candidate_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this session")

    new_review = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "booking_id": review.booking_id,
        "interviewer_id": booking["interviewer_id"],
        "candidate_id": user["user_id"],
        "candidate_name": user.get("name"),
        "rating": review.rating,
        "comment": review.comment,
        "created_at": now_iso()
    }
    await db.reviews.insert_one(new_review)

    # Update the interviewer's aggregate rating
    all_reviews = await db.reviews.find({"interviewer_id": booking["interviewer_id"]}).to_list(length=None)
    if all_reviews:
        avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
        interview_count = await db.bookings.count_documents(
            {"interviewer_id": booking["interviewer_id"], "status": "completed"}
        )
        tier_info = compute_monetization_tier(interview_count, avg_rating)
        await db.users.update_one(
            {"user_id": booking["interviewer_id"]},
            {"$set": {
                "avg_rating": round(avg_rating, 2),
                "review_count": len(all_reviews),
                "completed_interview_count": interview_count,
                "monetization_tier": tier_info["tier"],
                "platform_rate_inr": tier_info["rate_inr"],
                "is_monetized": tier_info["is_monetized"],
            }}
        )

    return strip_mongo(new_review)


@router.get("/interviewer/{interviewer_id}")
async def get_interviewer_reviews(interviewer_id: str):
    """Get all reviews for a specific interviewer (public)."""
    cursor = db.reviews.find({"interviewer_id": interviewer_id}).sort("created_at", -1)
    reviews = await cursor.to_list(length=50)
    return [strip_mongo(r) for r in reviews]


@router.get("/check/{booking_id}")
async def check_reviewed(booking_id: str, user: dict = Depends(get_current_user)):
    """Check if the current user has already reviewed a booking."""
    existing = await db.reviews.find_one({"booking_id": booking_id, "candidate_id": user["user_id"]})
    return {"reviewed": existing is not None}
