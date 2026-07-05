"""Resume upload routes."""
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File

from core import (
    db, get_current_user, put_object, extract_resume_text, now_iso, APP_NAME,
)

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Max 8MB")
    ext = (file.filename or "resume").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    resume_id = f"res_{uuid.uuid4().hex[:12]}"
    path = f"{APP_NAME}/resumes/{user['user_id']}/{resume_id}.{ext}"
    result = put_object(path, data, file.content_type or "application/octet-stream")
    text = extract_resume_text(file.filename or "", data)
    doc = {
        "resume_id": resume_id,
        "user_id": user["user_id"],
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "extracted_text": text,
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.resumes.insert_one(doc)
    return {k: v for k, v in doc.items() if k not in ("extracted_text", "storage_path", "_id")}


@router.get("")
async def list_resumes(user: dict = Depends(get_current_user)):
    docs = await db.resumes.find(
        {"user_id": user["user_id"], "is_deleted": False},
        {"_id": 0, "extracted_text": 0, "storage_path": 0},
    ).sort("created_at", -1).to_list(100)
    return docs
