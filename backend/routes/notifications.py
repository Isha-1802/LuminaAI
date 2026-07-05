import logging
import uuid
from fastapi import APIRouter, Depends
from typing import Optional

from core import db, get_current_user, strip_mongo, now_iso

logger = logging.getLogger("lumina.notifications")
router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/")
async def get_notifications(user: dict = Depends(get_current_user)):
    """Get all notifications for the current user (newest first)."""
    cursor = db.notifications.find({"user_id": user["user_id"]}).sort("created_at", -1)
    notifications = await cursor.to_list(length=30)
    return [strip_mongo(n) for n in notifications]


@router.get("/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    """Get count of unread notifications."""
    count = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"count": count}


@router.put("/mark-read")
async def mark_all_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read."""
    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True}


@router.put("/{notification_id}/read")
async def mark_one_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a single notification as read."""
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"success": True}


# Helper function to create notifications (called by other routes)
async def create_notification(user_id: str, title: str, body: str, link: Optional[str] = None):
    """Create a notification for a user."""
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "title": title,
        "body": body,
        "link": link,
        "read": False,
        "created_at": now_iso()
    }
    await db.notifications.insert_one(notification)
    return notification
