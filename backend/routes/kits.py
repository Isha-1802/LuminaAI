"""Kits (interview templates for interviewer role)."""
import uuid
from fastapi import APIRouter, HTTPException, Depends

from core import db, get_current_user, now_iso, KitInput

router = APIRouter(prefix="/api/kits", tags=["kits"])


@router.get("")
async def list_kits(user: dict = Depends(get_current_user)):
    docs = await db.kits.find(
        {"owner_user_id": user["user_id"], "is_deleted": {"$ne": True}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    return docs


@router.post("")
async def create_kit(payload: KitInput, user: dict = Depends(get_current_user)):
    kit_id = f"kit_{uuid.uuid4().hex[:12]}"
    doc = {
        "kit_id": kit_id,
        "owner_user_id": user["user_id"],
        "is_deleted": False,
        **payload.model_dump(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    # panel_config comes in as Pydantic; already dumped
    await db.kits.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/{kit_id}")
async def update_kit(kit_id: str, payload: KitInput, user: dict = Depends(get_current_user)):
    existing = await db.kits.find_one({"kit_id": kit_id, "owner_user_id": user["user_id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Kit not found")
    update = payload.model_dump()
    update["updated_at"] = now_iso()
    await db.kits.update_one({"kit_id": kit_id, "owner_user_id": user["user_id"]}, {"$set": update})
    return {**existing, **update}


@router.delete("/{kit_id}")
async def delete_kit(kit_id: str, user: dict = Depends(get_current_user)):
    result = await db.kits.update_one(
        {"kit_id": kit_id, "owner_user_id": user["user_id"]},
        {"$set": {"is_deleted": True, "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kit not found")
    return {"ok": True}


@router.get("/{kit_id}")
async def get_kit(kit_id: str, user: dict = Depends(get_current_user)):
    doc = await db.kits.find_one(
        {"kit_id": kit_id, "owner_user_id": user["user_id"], "is_deleted": {"$ne": True}},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Kit not found")
    return doc
