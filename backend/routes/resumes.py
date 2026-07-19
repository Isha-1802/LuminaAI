"""Resume upload routes."""
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File

from core import (
    db, get_current_user, put_object, extract_resume_text, now_iso, APP_NAME,
    llm_chat, safe_json,
)

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/{resume_id}/analyze")
async def analyze_resume(resume_id: str, user: dict = Depends(get_current_user)):
    """AI review of an uploaded resume. Cached on the resume after first run."""
    doc = await db.resumes.find_one(
        {"resume_id": resume_id, "user_id": user["user_id"], "is_deleted": False},
        {"_id": 0, "extracted_text": 1, "original_filename": 1, "analysis": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found")
    if doc.get("analysis"):
        return doc["analysis"]

    text = (doc.get("extracted_text") or "").strip()
    if len(text) < 100:
        raise HTTPException(status_code=400, detail="Could not read enough text from this resume to analyze")

    prompt = (
        "You are Lumina's resume critique engine — a seasoned tech recruiter with high standards. "
        "Review the resume below and produce STRICT JSON matching this schema exactly:\n"
        "{\n"
        '  "overall_score": <int 0-100>,\n'
        '  "verdict": "<one punchy sentence — the headline impression a recruiter forms in 10 seconds>",\n'
        '  "strengths": [<3-4 short strings — what genuinely works>],\n'
        '  "weaknesses": [<3-4 short strings — what hurts it, be direct>],\n'
        '  "missing_keywords": [<5-8 skill/keyword strings an ATS or recruiter would expect for this profile but did not find>],\n'
        '  "quick_fixes": [<3-5 concrete edits doable in under an hour, e.g. quantify the impact of X project>],\n'
        '  "summary": "<3-4 sentence overall review, honest but encouraging>"\n'
        "}\n\n"
        f"RESUME TEXT:\n{text[:9000]}\n\nReturn ONLY valid JSON."
    )
    raw = await llm_chat(
        "llama-3.3-70b-versatile", f"resume-{resume_id}",
        "You output strict JSON only. Never include prose outside JSON.", prompt,
    )
    analysis = safe_json(raw)
    if not analysis:
        raise HTTPException(status_code=502, detail="Analysis failed to parse — please try again")

    analysis["analyzed_at"] = now_iso()
    await db.resumes.update_one({"resume_id": resume_id}, {"$set": {"analysis": analysis}})
    return analysis


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


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user: dict = Depends(get_current_user)):
    """Remove a resume from the candidate's list.

    Soft delete: past interviews that referenced this resume keep working.
    """
    result = await db.resumes.update_one(
        {"resume_id": resume_id, "user_id": user["user_id"], "is_deleted": False},
        {"$set": {"is_deleted": True, "deleted_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"ok": True, "resume_id": resume_id}


@router.get("")
async def list_resumes(user: dict = Depends(get_current_user)):
    docs = await db.resumes.find(
        {"user_id": user["user_id"], "is_deleted": False},
        {"_id": 0, "extracted_text": 0, "storage_path": 0},
    ).sort("created_at", -1).to_list(100)
    return docs
