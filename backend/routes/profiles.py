import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from core import db, get_current_user, UserProfileInput, strip_mongo, now_iso, MONETIZATION_TIERS, compute_monetization_tier

logger = logging.getLogger("lumina.profiles")
router = APIRouter(prefix="/api/profiles", tags=["Profiles"])


@router.get("/monetization-tiers")
async def get_monetization_tiers():
    """Return the full monetization tier definitions (public)."""
    return MONETIZATION_TIERS

@router.get("/me")
async def get_my_profile(user: dict = Depends(get_current_user)):
    """Get the current user's full profile."""
    # The user dict already contains all fields stored in the db
    safe_user = strip_mongo(user)
    safe_user.pop("hashed_password", None)
    return safe_user

@router.put("/me")
async def update_my_profile(profile_data: UserProfileInput, user: dict = Depends(get_current_user)):
    """Update the current user's profile."""
    update_fields = profile_data.model_dump(exclude_unset=True)
    update_fields["updated_at"] = now_iso()
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_fields}
    )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]})
    safe_user = strip_mongo(updated_user)
    safe_user.pop("hashed_password", None)
    return safe_user

from fastapi import UploadFile, File
from core import put_object, APP_NAME
import uuid

@router.post("/me/picture")
async def upload_profile_picture(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a profile picture and save the URL to the user profile."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Max 5MB for profile pictures")
    
    ext = (file.filename or "image").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    pic_id = f"pic_{uuid.uuid4().hex[:8]}"
    path = f"{APP_NAME}/profiles/{user['user_id']}/{pic_id}.{ext}"
    
    # Save file
    put_object(path, data, file.content_type or "image/jpeg")
    
    # URL to access the image via static mount
    picture_url = f"/uploads/{path}"
    
    # Update user in DB
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"picture": picture_url, "updated_at": now_iso()}}
    )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]})
    safe_user = strip_mongo(updated_user)
    safe_user.pop("hashed_password", None)
    return safe_user

@router.get("/interviewers")
async def search_interviewers(
    q: Optional[str] = None,
    skill: Optional[str] = None,
    company: Optional[str] = None,
    limit: int = 50,
):
    """Search for available interviewers."""
    query = {
        "role": "interviewer",
        "is_available": True
    }
    
    if q:
        # Simple text search on name, headline, about
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"headline": {"$regex": q, "$options": "i"}},
            {"about": {"$regex": q, "$options": "i"}}
        ]
        
    if skill:
        query["skills"] = {"$regex": skill, "$options": "i"}
        
    if company:
        query["current_company"] = {"$regex": company, "$options": "i"}
        
    cursor = db.users.find(query).limit(limit)
    interviewers = await cursor.to_list(length=limit)
    
    # Strip sensitive info
    safe_interviewers = []
    for interviewer in interviewers:
        safe = strip_mongo(interviewer)
        safe.pop("hashed_password", None)
        safe.pop("email", None) # Keep email private until booked
        safe_interviewers.append(safe)
        
    return safe_interviewers

@router.get("/interviewers/{user_id}")
async def get_interviewer(user_id: str):
    """Get a specific interviewer by user_id."""
    interviewer = await db.users.find_one({"user_id": user_id, "role": "interviewer"})
    if not interviewer:
        raise HTTPException(status_code=404, detail="Interviewer not found")
        
    safe = strip_mongo(interviewer)
    safe.pop("hashed_password", None)
    safe.pop("email", None)
    return safe
