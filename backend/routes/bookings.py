import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException

from core import db, get_current_user, BookingInput, strip_mongo, now_iso, compute_monetization_tier
from routes.notifications import create_notification

logger = logging.getLogger("lumina.bookings")
router = APIRouter(prefix="/api/bookings", tags=["Bookings"])

@router.get("/")
async def get_my_bookings(user: dict = Depends(get_current_user)):
    """Get upcoming bookings for the current user (as candidate or interviewer)."""
    user_id = user["user_id"]
    role = user.get("role", "interviewee")
    
    # Depending on role, we query either candidate_id or interviewer_id
    if role == "interviewer":
        query = {"interviewer_id": user_id}
    else:
        query = {"candidate_id": user_id}
        
    cursor = db.bookings.find(query).sort("start_time", 1)
    bookings = await cursor.to_list(length=100)
    
    return [strip_mongo(b) for b in bookings]


@router.get("/{booking_id}")
async def get_booking_by_id(booking_id: str, user: dict = Depends(get_current_user)):
    """Get a specific booking by ID."""
    booking = await db.bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking["candidate_id"] != user["user_id"] and booking["interviewer_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
        
    return strip_mongo(booking)


@router.post("/")
async def create_booking(booking_data: BookingInput, user: dict = Depends(get_current_user)):
    """Create a new booking."""
    if user.get("role") == "interviewer":
        raise HTTPException(status_code=403, detail="Interviewers cannot book other interviewers directly.")
        
    interviewer = await db.users.find_one({"user_id": booking_data.interviewer_id})
    if not interviewer or interviewer.get("role") != "interviewer":
        raise HTTPException(status_code=404, detail="Interviewer not found")
        
    if not interviewer.get("is_available"):
        raise HTTPException(status_code=400, detail="This interviewer is not currently accepting bookings")
        
    # Check if the slot is in their available_slots
    available_slots = interviewer.get("available_slots", [])
    if booking_data.start_time not in available_slots:
        raise HTTPException(status_code=400, detail="This time slot is not available")
        
    # Check for double booking
    existing = await db.bookings.find_one({
        "interviewer_id": booking_data.interviewer_id,
        "start_time": booking_data.start_time,
        "status": {"$ne": "cancelled"}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is already booked")
        
    booking_id = f"booking_{uuid.uuid4().hex[:12]}"
    
    # Generate a functional Jitsi Meet link
    meet_link = f"https://meet.jit.si/Lumina-{booking_id}"
    
    new_booking = {
        "booking_id": booking_id,
        "candidate_id": user["user_id"],
        "interviewer_id": booking_data.interviewer_id,
        "interviewer_name": interviewer.get("name"),
        "candidate_name": user.get("name"),
        "start_time": booking_data.start_time,
        "end_time": booking_data.end_time,
        "status": "scheduled",
        "meet_link": meet_link,
        "created_at": now_iso()
    }
    
    await db.bookings.insert_one(new_booking)
    
    # Remove this slot from the interviewer's availability to prevent further bookings
    await db.users.update_one(
        {"user_id": booking_data.interviewer_id},
        {"$pull": {"available_slots": booking_data.start_time}}
    )
    
    # Notify the interviewer
    await create_notification(
        user_id=booking_data.interviewer_id,
        title="New Interview Booked",
        body=f"{user.get('name')} has booked a session with you on {booking_data.start_time[:10]}.",
        link=f"/booking/{booking_id}"
    )
    
    return strip_mongo(new_booking)


@router.delete("/{booking_id}")
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Cancel a booking."""
    booking = await db.bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking["candidate_id"] != user["user_id"] and booking["interviewer_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
        
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {"status": "cancelled", "updated_at": now_iso()}}
    )
    
    # Add slot back to available_slots
    await db.users.update_one(
        {"user_id": booking["interviewer_id"]},
        {"$addToSet": {"available_slots": booking["start_time"]}}
    )
    
    return {"status": "cancelled"}


@router.put("/{booking_id}/complete")
async def complete_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Mark a booking as completed (Interviewer only)."""
    if user.get("role") != "interviewer":
        raise HTTPException(status_code=403, detail="Only interviewers can complete a session")
        
    booking = await db.bookings.find_one({"booking_id": booking_id})
    if not booking or booking["interviewer_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Booking not found or not authorized")
        
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {"status": "completed", "updated_at": now_iso()}}
    )
    
    # Recompute monetization tier based on completed interview count
    interview_count = await db.bookings.count_documents(
        {"interviewer_id": user["user_id"], "status": "completed"}
    )
    interviewer = await db.users.find_one({"user_id": user["user_id"]})
    avg_rating = interviewer.get("avg_rating", 0.0) if interviewer else 0.0
    tier_info = compute_monetization_tier(interview_count, avg_rating)
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "completed_interview_count": interview_count,
            "monetization_tier": tier_info["tier"],
            "platform_rate_inr": tier_info["rate_inr"],
            "is_monetized": tier_info["is_monetized"],
        }}
    )

    # Notify candidate that interview is completed
    await create_notification(
        user_id=booking["candidate_id"],
        title="Interview Completed",
        body=f"Your session with {user.get('name')} has been marked as completed. Leave a review!",
        link=f"/booking/{booking_id}"
    )
    
    return {"status": "completed", "tier": tier_info}
