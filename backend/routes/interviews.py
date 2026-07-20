"""Interview routes: create, list, get, message (SSE + non-stream), voice, recording, feedback, pdf."""
import io
import uuid
import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response, Query
from fastapi.responses import StreamingResponse

from core import (
    db, get_current_user, now_iso, APP_NAME,
    InterviewCreateInput, MessageInput,
    build_interview_system_prompt, build_panel_counsel_prompt,
    llm_chat, llm_stream, safe_json,
    put_object, get_object,
    openai_stt, openai_tts,
    render_report_pdf, AVAILABLE_MODELS, ATELIERS,
    compute_speech_analytics,
)

router = APIRouter(prefix="/api", tags=["interviews"])


@router.get("/models")
async def list_models():
    return AVAILABLE_MODELS


@router.get("/ateliers")
async def list_ateliers():
    return ATELIERS


def _next_counsel(panel: list, ai_msg_count: int) -> dict:
    return panel[ai_msg_count % len(panel)]


async def _resume_text(user_id: str, resume_id: Optional[str]) -> Optional[str]:
    if not resume_id:
        return None
    res = await db.resumes.find_one(
        {"resume_id": resume_id, "user_id": user_id, "is_deleted": False},
        {"_id": 0, "extracted_text": 1},
    )
    return (res or {}).get("extracted_text") or None


@router.post("/interviews")
async def create_interview(payload: InterviewCreateInput, user: dict = Depends(get_current_user)):
    interview_id = f"iv_{uuid.uuid4().hex[:12]}"
    resume_text = await _resume_text(user["user_id"], payload.resume_id)

    spec = payload.model_dump()
    panel = None
    if payload.interview_type == "panel":
        panel = [p.model_dump() for p in (payload.panel_config or [])]
        if not panel:
            # default 3-person panel
            panel = [
                {"name": "Priya", "role": "Engineering Manager", "style": "warm, story-driven, systems-minded"},
                {"name": "Ola", "role": "Staff Engineer", "style": "precise, probing, tradeoff-focused"},
                {"name": "Ren", "role": "Cross-functional partner", "style": "product-minded, curious, empathetic"},
            ]
        counsel = _next_counsel(panel, 0)
        first_ai = await llm_chat(
            payload.model_id, interview_id,
            build_panel_counsel_prompt(spec, counsel, panel, 0, payload.num_questions, resume_text),
            "Introduce yourself in ONE sentence and ask your first question.",
        )
        first_msg = {"role": "assistant", "counsel_name": counsel["name"], "counsel_role": counsel["role"], "content": first_ai, "ts": now_iso()}
        system_prompt = None  # per-turn dynamic prompts for panel mode
    else:
        system_prompt = build_interview_system_prompt(spec, resume_text)
        first_ai = await llm_chat(payload.model_id, interview_id, system_prompt, "Begin the interview now.")
        first_msg = {"role": "assistant", "content": first_ai, "ts": now_iso()}

    interview = {
        "interview_id": interview_id,
        "user_id": user["user_id"],
        "role_title": payload.role_title,
        "interview_type": payload.interview_type,
        "interview_types": payload.interview_types or [payload.interview_type],
        "difficulty": payload.difficulty,
        "model_id": payload.model_id,
        "resume_id": payload.resume_id,
        "atelier_id": payload.atelier_id,
        "kit_id": payload.kit_id,
        "num_questions": payload.num_questions,
        "panel_config": panel,
        "system_prompt": system_prompt,
        "messages": [first_msg],
        "status": "in_progress",
        "feedback": None,
        "score": None,
        "share_token": None,
        "created_at": now_iso(),
        "completed_at": None,
    }
    await db.interviews.insert_one(interview)
    return {k: v for k, v in interview.items() if k not in ("system_prompt", "_id")}


@router.get("/interviews")
async def list_interviews(user: dict = Depends(get_current_user)):
    docs = await db.interviews.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "system_prompt": 0, "messages": 0},
    ).sort("created_at", -1).to_list(200)
    return docs


@router.get("/interviews/{interview_id}")
async def get_interview(interview_id: str, user: dict = Depends(get_current_user)):
    doc = await db.interviews.find_one(
        {"interview_id": interview_id, "user_id": user["user_id"]},
        {"_id": 0, "system_prompt": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    return doc


def _transcript_text(messages: list, user_msg: dict) -> str:
    lines = []
    for m in messages + [user_msg]:
        if m["role"] == "assistant":
            who = m.get("counsel_name") or "Interviewer"
        else:
            who = "Candidate"
        lines.append(f"{who}: {m['content']}")
    return "\n\n".join(lines)


async def _reply_prompt(doc: dict, user_msg: dict, resume_text: Optional[str]):
    """Return (system_prompt, user_text, ai_msg_meta) tuple for the next AI turn."""
    convo = _transcript_text(doc["messages"], user_msg)
    if doc.get("interview_type") == "panel" and doc.get("panel_config"):
        panel = doc["panel_config"]
        ai_count = sum(1 for m in doc["messages"] if m["role"] == "assistant")
        counsel = _next_counsel(panel, ai_count)
        prompt = build_panel_counsel_prompt(
            {
                "role_title": doc["role_title"], "difficulty": doc["difficulty"],
                "atelier_id": doc.get("atelier_id"),
            },
            counsel, panel, ai_count, doc["num_questions"], resume_text,
        )
        meta = {"counsel_name": counsel["name"], "counsel_role": counsel["role"]}
        return prompt, f"Conversation so far:\n\n{convo}\n\nAs {counsel['name']}, ask the next question.", meta

    # Standard single-counsel
    prompt = doc["system_prompt"] or build_interview_system_prompt(
        {
            "role_title": doc["role_title"], "difficulty": doc["difficulty"],
            "interview_type": doc["interview_type"],
            "interview_types": doc.get("interview_types"),
            "num_questions": doc["num_questions"],
            "atelier_id": doc.get("atelier_id"),
        },
        resume_text,
    )
    return prompt, f"Conversation so far:\n\n{convo}\n\nInterviewer:", {}


@router.post("/interviews/{interview_id}/message")
async def send_message(interview_id: str, payload: MessageInput, user: dict = Depends(get_current_user)):
    doc = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed")

    user_msg = {"role": "user", "content": payload.content, "ts": now_iso()}
    resume_text = await _resume_text(user["user_id"], doc.get("resume_id"))
    prompt, user_text, meta = await _reply_prompt(doc, user_msg, resume_text)

    ai_reply = await llm_chat(doc["model_id"], interview_id, prompt, user_text)
    completed = "[INTERVIEW_COMPLETE]" in ai_reply
    clean = ai_reply.replace("[INTERVIEW_COMPLETE]", "").strip()
    ai_msg = {"role": "assistant", "content": clean, "ts": now_iso(), **meta}

    await db.interviews.update_one({"interview_id": interview_id}, {"$push": {"messages": {"$each": [user_msg, ai_msg]}}})

    if completed:
        feedback = await _generate_feedback(interview_id, user)
        return {"assistant": ai_msg, "completed": True, "feedback": feedback}
    return {"assistant": ai_msg, "completed": False}


@router.get("/interviews/{interview_id}/stream")
async def stream_message(interview_id: str, content: str = Query(..., min_length=1), user: dict = Depends(get_current_user)):
    doc = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed")

    user_msg = {"role": "user", "content": content, "ts": now_iso()}
    resume_text = await _resume_text(user["user_id"], doc.get("resume_id"))
    prompt, user_text, meta = await _reply_prompt(doc, user_msg, resume_text)

    async def event_stream():
        buf = ""
        async for chunk in llm_stream(doc["model_id"], interview_id, prompt, user_text):
            if chunk.startswith("[[ERROR:"):
                yield f"event: error\ndata: {json.dumps({'message': chunk})}\n\n"
                return
            buf += chunk
            yield f"event: delta\ndata: {json.dumps({'content': chunk, 'meta': meta})}\n\n"
        completed = "[INTERVIEW_COMPLETE]" in buf
        clean = buf.replace("[INTERVIEW_COMPLETE]", "").strip()
        ai_msg = {"role": "assistant", "content": clean, "ts": now_iso(), **meta}
        await db.interviews.update_one(
            {"interview_id": interview_id},
            {"$push": {"messages": {"$each": [user_msg, ai_msg]}}},
        )
        payload = {"completed": completed, "assistant": ai_msg}
        if completed:
            feedback = await _generate_feedback(interview_id, user)
            payload["feedback"] = feedback
        yield f"event: done\ndata: {json.dumps(payload)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.post("/interviews/{interview_id}/message/audio")
async def transcribe_and_reply(interview_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    doc = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio")
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio too large (25MB max)")
    stream = io.BytesIO(data)
    stream.name = file.filename or "audio.webm"
    try:
        resp = await openai_stt().transcribe(file=stream, model="whisper-1", response_format="json", language="en")
        transcript = getattr(resp, "text", None) or (resp.get("text") if isinstance(resp, dict) else str(resp))
    except Exception as e:
        msg = str(e).lower()
        if "budget" in msg:
            raise HTTPException(status_code=402, detail="OpenAI budget exhausted on your Universal Key. Top up in Profile → Universal Key.")
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)[:200]}")
    if not transcript or not transcript.strip():
        raise HTTPException(status_code=400, detail="No speech detected")
    return await send_message(interview_id, MessageInput(content=transcript.strip()), user)


@router.post("/tts")
async def synthesize_speech(payload: dict, user: dict = Depends(get_current_user)):
    text = (payload or {}).get("text", "").strip()
    voice = (payload or {}).get("voice", "sage")
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    if len(text) > 4000:
        text = text[:4000]
    try:
        audio_bytes = await openai_tts().generate_speech(text=text, model="tts-1", voice=voice, response_format="mp3")
    except Exception as e:
        msg = str(e).lower()
        if "budget" in msg:
            raise HTTPException(status_code=402, detail="OpenAI budget exhausted on your Universal Key. Top up in Profile → Universal Key.")
        raise HTTPException(status_code=502, detail=f"TTS failed: {str(e)[:200]}")
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")


@router.post("/interviews/{interview_id}/recording")
async def upload_recording(
    interview_id: str,
    file: UploadFile = File(...),
    presence_pct: float = Form(0.0),
    speaking_pct: float = Form(0.0),
    duration_seconds: float = Form(0.0),
    user: dict = Depends(get_current_user),
):
    doc = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty recording")
    if len(data) > 60 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Recording too large (60MB max)")
    ext = "webm"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    path = f"{APP_NAME}/recordings/{user['user_id']}/{interview_id}_{uuid.uuid4().hex[:8]}.{ext}"
    result = put_object(path, data, file.content_type or "video/webm")
    engagement = round(min(100.0, (presence_pct + speaking_pct) / 2), 1)
    recording = {
        "storage_path": result["path"],
        "size": result.get("size", len(data)),
        "content_type": file.content_type,
        "duration_seconds": duration_seconds,
        "presence_pct": round(presence_pct, 1),
        "speaking_pct": round(speaking_pct, 1),
        "engagement_score": engagement,
        "created_at": now_iso(),
    }
    await db.interviews.update_one({"interview_id": interview_id}, {"$set": {"recording": recording}})
    return {"ok": True, "recording": {k: v for k, v in recording.items() if k != "storage_path"}}


@router.get("/interviews/{interview_id}/recording")
async def download_recording(interview_id: str, user: dict = Depends(get_current_user)):
    doc = await db.interviews.find_one(
        {"interview_id": interview_id, "user_id": user["user_id"]},
        {"_id": 0, "recording": 1},
    )
    if not doc or not doc.get("recording"):
        raise HTTPException(status_code=404, detail="No recording")
    path = doc["recording"]["storage_path"]
    data, ct = get_object(path)
    return Response(content=data, media_type=doc["recording"].get("content_type") or ct)


async def _generate_feedback(interview_id: str, user: dict):
    doc = await db.interviews.find_one({"interview_id": interview_id, "user_id": user["user_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    transcript = "\n".join(
        f"{m.get('counsel_name','Interviewer') if m['role']=='assistant' else 'Candidate'}: {m['content']}" for m in doc["messages"]
    )
    fb_prompt = (
        "You are Lumina's evaluation engine. Analyze the transcript and produce STRICT JSON matching this schema exactly:\n"
        "{\n"
        '  "overall_score": <int 0-100>,\n'
        '  "scores": {"technical": <0-100>, "communication": <0-100>, "problem_solving": <0-100>, "confidence": <0-100>},\n'
        '  "heatmap": {"communication": <0-100>, "problem_solving": <0-100>, "technical_depth": <0-100>, "confidence": <0-100>, "leadership": <0-100>, "system_design": <0-100>},\n'
        '  "strengths": [<3 short strings>],\n'
        '  "improvements": [<3 short strings>],\n'
        '  "summary": "<2-3 sentence executive summary>",\n'
        '  "next_steps": [<3 actionable strings>],\n'
        '  "question_analysis": [{"question": "<short paraphrase of each question asked>", "verdict": "strong" | "adequate" | "struggled", "note": "<one sentence: why — e.g. vague answer, missed tradeoffs, rambled, nailed the core idea>"}],\n'
        '  "action_items": [<3-5 concrete, specific practice tasks with a measurable target, e.g. "Explain a database index tradeoff out loud in under 60 seconds">],\n'
        '  "next_rehearsal": {"focus": "<single weakest topic to target next>", "interview_type": "technical" | "behavioral" | "coding" | "hr" | "panel", "difficulty": "easy" | "medium" | "hard", "reason": "<one sentence why this setup targets their weakest spot>"}\n'
        "}\n\n"
        "question_analysis must cover every question the interviewer asked, in order.\n"
        "The heatmap axes are independent of scores: judge leadership from ownership/initiative in answers, "
        "and system_design from architecture/tradeoff reasoning (score low-but-fair if the interview type never touched that axis).\n\n"
        f"Role: {doc['role_title']} | Type: {doc['interview_type']} | Difficulty: {doc['difficulty']}\n\n"
        f"TRANSCRIPT:\n{transcript}\n\nReturn ONLY valid JSON."
    )
    raw = await llm_chat(doc["model_id"], f"{interview_id}-feedback", "You output strict JSON only. Never include prose outside JSON.", fb_prompt)
    default_heatmap = {"communication": 0, "problem_solving": 0, "technical_depth": 0, "confidence": 0, "leadership": 0, "system_design": 0}
    feedback = safe_json(raw) or {
        "overall_score": 0,
        "scores": {"technical": 0, "communication": 0, "problem_solving": 0, "confidence": 0},
        "heatmap": default_heatmap,
        "strengths": [], "improvements": ["Feedback parsing failed. Please retry."],
        "summary": raw[:500], "next_steps": [],
        "question_analysis": [], "action_items": [], "next_rehearsal": None,
    }
    if not feedback.get("heatmap"):
        feedback["heatmap"] = default_heatmap
    feedback.setdefault("question_analysis", [])
    feedback.setdefault("action_items", [])
    feedback.setdefault("next_rehearsal", None)

    speech_analytics = compute_speech_analytics(doc["messages"])

    await db.interviews.update_one(
        {"interview_id": interview_id},
        {"$set": {
            "status": "completed",
            "feedback": feedback,
            "score": feedback.get("overall_score", 0),
            "speech_analytics": speech_analytics,
            "completed_at": now_iso(),
        }},
    )
    return feedback


@router.post("/interviews/{interview_id}/finish")
async def finish_interview(interview_id: str, user: dict = Depends(get_current_user)):
    return {"feedback": await _generate_feedback(interview_id, user)}


@router.get("/interviews/{interview_id}/report/pdf")
async def download_report_pdf(interview_id: str, user: dict = Depends(get_current_user)):
    doc = await db.interviews.find_one(
        {"interview_id": interview_id, "user_id": user["user_id"]},
        {"_id": 0, "system_prompt": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    fb = doc.get("feedback") or {}
    pdf_bytes = render_report_pdf(doc, fb)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="lumina-{interview_id}.pdf"'},
    )
