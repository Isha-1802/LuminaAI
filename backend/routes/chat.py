import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body

from core import db, get_current_user, strip_mongo, now_iso

logger = logging.getLogger("lumina.chat")
router = APIRouter(prefix="/api/chat", tags=["Chat"])

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
