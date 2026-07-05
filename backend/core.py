"""Lumina shared core: config, db, models, deps, storage, llm, helpers, pdf."""
from __future__ import annotations

import os
import io
import json
import uuid
import bcrypt
import jwt
import logging
import requests
from pathlib import Path
from typing import Optional, Literal, List
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, Request, Response
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from emergentintegrations.llm.openai import OpenAISpeechToText, OpenAITextToSpeech

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Config ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
JWT_SECRET = os.environ["JWT_SECRET"]
APP_NAME = os.environ.get("APP_NAME", "lumina-interview")

JWT_ALG = "HS256"
JWT_EXP_DAYS = 30
SESSION_EXP_DAYS = 7

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

logger = logging.getLogger("lumina")

# --- Available models ---
AVAILABLE_MODELS = [
    {"id": "claude-sonnet-4-5-20250929", "provider": "anthropic", "label": "Claude Sonnet 4.5", "family": "Anthropic"},
    {"id": "gpt-5.2", "provider": "openai", "label": "GPT-5.2", "family": "OpenAI"},
    {"id": "gemini-3-flash-preview", "provider": "gemini", "label": "Gemini 3 Flash", "family": "Google"},
]

# --- Curated Ateliers (company presets) ---
# Each atelier tunes: culture_notes, typical topics, difficulty hint, palette
ATELIERS = [
    {
        "id": "stripe", "name": "Stripe", "tagline": "Payments · Precision · Prose",
        "accent": "#635bff", "difficulty": "hard",
        "topics": ["API design", "distributed transactions", "idempotency", "developer experience", "clear technical writing"],
        "culture_notes": "Stripe values writing (long-form docs), extreme precision, and API elegance. Interviewers probe reasoning depth over speed, and prize candidates who can articulate tradeoffs in writing-quality prose.",
    },
    {
        "id": "airbnb", "name": "Airbnb", "tagline": "Belonging · Craft · Empathy",
        "accent": "#ff5a5f", "difficulty": "medium",
        "topics": ["design thinking", "user empathy", "hosting flows", "trust & safety", "storytelling"],
        "culture_notes": "Airbnb interviews weight craft, empathy, and belonging deeply. Behavioral rounds probe how you build trust and design for humans. Technical rounds respect elegant, readable solutions.",
    },
    {
        "id": "anthropic", "name": "Anthropic", "tagline": "Safety · Rigor · Humility",
        "accent": "#c9a96e", "difficulty": "hard",
        "topics": ["AI safety", "responsible deployment", "evaluation", "reasoning under uncertainty", "epistemic humility"],
        "culture_notes": "Anthropic interviews are exceptionally thoughtful. Interviewers reward candidates who reason carefully about safety, admit uncertainty, and think from first principles rather than pattern-matching.",
    },
    {
        "id": "openai", "name": "OpenAI", "tagline": "Frontier · Velocity · Systems",
        "accent": "#10a37f", "difficulty": "hard",
        "topics": ["large-scale systems", "GPU orchestration", "inference latency", "product experimentation", "research → product"],
        "culture_notes": "OpenAI moves fast and expects candidates to reason about frontier-scale systems. Interviewers probe your ability to bridge research and production and hold both in your head at once.",
    },
    {
        "id": "vercel", "name": "Vercel", "tagline": "Frontend · Performance · Edge",
        "accent": "#ffffff", "difficulty": "medium",
        "topics": ["Next.js internals", "edge runtime", "streaming SSR", "DX", "performance budgets"],
        "culture_notes": "Vercel interviews prize deep frontend knowledge, an intuition for performance, and clean DX thinking. They favor candidates who care about the developer as user.",
    },
    {
        "id": "linear", "name": "Linear", "tagline": "Craft · Speed · Restraint",
        "accent": "#5e6ad2", "difficulty": "medium",
        "topics": ["product craft", "keyboard-first UX", "state sync", "graph queries", "minimal APIs"],
        "culture_notes": "Linear reveres craft and restraint. Interviewers reward candidates who can defend removing features as much as adding them, and who care about micro-interactions.",
    },
    {
        "id": "notion", "name": "Notion", "tagline": "Blocks · Docs · Delight",
        "accent": "#ffffff", "difficulty": "medium",
        "topics": ["document model", "block-based data", "collaboration", "offline sync", "flexibility vs simplicity"],
        "culture_notes": "Notion candidates should love the tension between raw flexibility and product simplicity. Interviewers probe how you'd carve a beautiful path through both.",
    },
    {
        "id": "ramp", "name": "Ramp", "tagline": "Finance · Automation · Speed",
        "accent": "#f8e055", "difficulty": "medium",
        "topics": ["financial systems", "ledger design", "fraud detection", "expense automation", "compliance"],
        "culture_notes": "Ramp interviews are pragmatic and money-obsessed in the best way. Interviewers want to see you make crisp cost/benefit calls and reason about financial correctness.",
    },
    {
        "id": "figma", "name": "Figma", "tagline": "Collaboration · Craft · CRDT",
        "accent": "#a259ff", "difficulty": "hard",
        "topics": ["multiplayer editing", "CRDTs", "vector rendering", "webgl", "performance"],
        "culture_notes": "Figma interviews go deep on collaboration internals, vector math, and performance. They reward candidates with an artist's eye and an engineer's rigor.",
    },
]

# --- Mongo ---
_client = AsyncIOMotorClient(MONGO_URL)
db = _client[DB_NAME]


def mongo_client() -> AsyncIOMotorClient:
    return _client


# =======================
# Object Storage
# =======================
_storage_key: Optional[str] = None


def init_storage() -> str:
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# =======================
# Pydantic Models
# =======================
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: Literal["interviewee", "interviewer"] = "interviewee"


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionInput(BaseModel):
    session_id: str


class CounselPersona(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    role: str = Field(min_length=1, max_length=80)      # e.g. "Engineering Manager"
    style: Optional[str] = Field(default=None, max_length=180)  # e.g. "warm, probing, systems-thinker"


class InterviewCreateInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    role_title: str = Field(min_length=1)
    interview_type: Literal["technical", "behavioral", "coding", "hr", "panel"] = "technical"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    model_id: str = "gemini-3-flash-preview"
    resume_id: Optional[str] = None
    num_questions: int = Field(default=5, ge=3, le=12)
    atelier_id: Optional[str] = None        # "stripe" | "airbnb" | ...
    panel_config: Optional[List[CounselPersona]] = None  # for interview_type=panel
    kit_id: Optional[str] = None


class MessageInput(BaseModel):
    content: str = Field(min_length=1)


class KitInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    role_title: str = Field(min_length=1, max_length=120)
    interview_type: Literal["technical", "behavioral", "coding", "hr", "panel"] = "technical"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    num_questions: int = Field(default=5, ge=3, le=12)
    custom_prompt: Optional[str] = Field(default=None, max_length=2000)
    panel_config: Optional[List[CounselPersona]] = None
    atelier_id: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=800)


class InterviewNoteInput(BaseModel):
    verdict: Optional[Literal["hire", "borderline", "pass"]] = None
    note: Optional[str] = Field(default=None, max_length=2000)


# =======================
# Helpers
# =======================
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("sub")
    except Exception:
        return None


def safe_json(text: str):
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    try:
        start = text.index("{")
        end = text.rindex("}")
        return json.loads(text[start:end + 1])
    except Exception:
        return None


def strip_mongo(doc: dict) -> dict:
    """Remove Mongo internal fields for API safety."""
    return {k: v for k, v in doc.items() if k not in ("_id",)}


def extract_resume_text(filename: str, data: bytes) -> str:
    """Best-effort resume text extraction (PDF/DOCX/TXT)."""
    lower = (filename or "").lower()
    try:
        if lower.endswith(".pdf"):
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            return "\n".join((p.extract_text() or "") for p in reader.pages)[:12000]
        if lower.endswith(".docx"):
            from docx import Document
            doc = Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)[:12000]
        return data.decode("utf-8", errors="ignore")[:12000]
    except Exception as e:
        logger.warning(f"Resume text extract failed: {e}")
        return ""


# =======================
# Auth deps
# =======================
async def find_user(user_id: str) -> Optional[dict]:
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "hashed_password": 0})


async def get_current_user(request: Request) -> dict:
    # 1. Session cookie (Google auth)
    session_token = request.cookies.get("session_token")
    if session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if sess:
            expires_at = sess["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user = await find_user(sess["user_id"])
                if user:
                    return user

    # 2. Bearer JWT (email/password) OR Emergent session token via header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "", 1).strip()
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            user = await find_user(sess["user_id"])
            if user:
                return user
        user_id = decode_jwt(token)
        if user_id:
            user = await find_user(user_id)
            if user:
                return user

    raise HTTPException(status_code=401, detail="Not authenticated")


async def require_interviewer(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "interviewer":
        raise HTTPException(status_code=403, detail="Interviewer role required")
    return user


# =======================
# LLM helpers
# =======================
def resolve_model(model_id: str) -> tuple[str, str]:
    for m in AVAILABLE_MODELS:
        if m["id"] == model_id:
            return m["provider"], m["id"]
    return "gemini", "gemini-3-flash-preview"


def _atelier_notes(atelier_id: Optional[str]) -> str:
    if not atelier_id:
        return ""
    at = next((a for a in ATELIERS if a["id"] == atelier_id), None)
    if not at:
        return ""
    return (
        f"\n\nATELIER · {at['name']}\n"
        f"Culture: {at['culture_notes']}\n"
        f"Common topics: {', '.join(at['topics'])}.\n"
        f"Adjust question style to match this company's known interviewing patterns."
    )


def build_interview_system_prompt(spec: dict, resume_text: Optional[str]) -> str:
    """Standard single-counsel system prompt."""
    resume_block = f"\n\nCANDIDATE RESUME:\n{resume_text}\n" if resume_text else ""
    atelier_block = _atelier_notes(spec.get("atelier_id"))
    custom = spec.get("custom_prompt") or ""
    custom_block = f"\n\nCUSTOM DIRECTIVES:\n{custom}\n" if custom else ""
    return f"""You are Lumina, a world-class AI interview coach conducting a {spec['interview_type']} interview
for the role of "{spec['role_title']}" at {spec['difficulty']} difficulty.

Rules:
- Ask ONE question at a time.
- Total questions: {spec['num_questions']}.
- Keep questions crisp, specific, and progressively deeper.
- Do not give the answer. If the candidate is stuck, provide a brief nudge.
- Never break character. Do not include preambles like "Sure" or "Here's...".
- After the candidate answers question {spec['num_questions']}, respond with EXACTLY the token
  "[INTERVIEW_COMPLETE]" on its own line, then a one-sentence sign-off.
{atelier_block}{custom_block}{resume_block}
Begin by greeting the candidate briefly in ONE line, then ask question 1."""


def build_panel_counsel_prompt(spec: dict, counsel: dict, panel: list, q_index: int, total: int, resume_text: Optional[str]) -> str:
    """Per-counsel system prompt for panel simulations."""
    resume_block = f"\n\nCANDIDATE RESUME:\n{resume_text}\n" if resume_text else ""
    atelier_block = _atelier_notes(spec.get("atelier_id"))
    other = ", ".join(f"{c['name']} ({c['role']})" for c in panel if c['name'] != counsel['name'])
    style = counsel.get("style") or "professional, incisive, warm"
    return f"""You are {counsel['name']}, {counsel['role']}, on a panel interview for "{spec['role_title']}"
at {spec['difficulty']} difficulty. Your interviewing style: {style}.

Other panelists (already introduced): {other or 'none'}.
This is question {q_index + 1} of {total} across the panel.

Rules:
- Speak in the first person as {counsel['name']}.
- Ask exactly ONE question grounded in your role's perspective. Be crisp.
- Do not restate other panelists' questions.
- No preambles. No self-introductions after the first turn.
- If this is question {total}, end with EXACTLY the token "[INTERVIEW_COMPLETE]" on its own line, then a single-sentence panel sign-off.
{atelier_block}{resume_block}
Now: pose the next question as {counsel['name']}."""


async def llm_chat(model_id: str, session_id: str, system_prompt: str, user_text: str) -> str:
    provider, model = resolve_model(model_id)
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model(provider, model)
    try:
        reply = await chat.send_message(UserMessage(text=user_text))
    except Exception as e:
        msg = str(e).lower()
        if "budget" in msg:
            raise HTTPException(
                status_code=402,
                detail="Your Emergent Universal Key budget is exhausted for this provider. Add balance in Profile → Universal Key, or switch to Gemini 3 Flash.",
            )
        raise HTTPException(status_code=502, detail=f"AI provider error: {str(e)[:200]}")
    return reply if isinstance(reply, str) else str(reply)


async def llm_stream(model_id: str, session_id: str, system_prompt: str, user_text: str):
    provider, model = resolve_model(model_id)
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model(provider, model)
    try:
        async for event in chat.stream_message(UserMessage(text=user_text)):
            if isinstance(event, TextDelta):
                yield event.content
            elif isinstance(event, StreamDone):
                break
    except Exception as e:
        msg = str(e).lower()
        if "budget" in msg:
            yield "[[ERROR:BUDGET_EXHAUSTED]]"
        else:
            yield f"[[ERROR:{str(e)[:180]}]]"


def openai_stt() -> OpenAISpeechToText:
    return OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)


def openai_tts() -> OpenAITextToSpeech:
    return OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)


# =======================
# PDF report renderer
# =======================
def render_report_pdf(interview: dict, fb: dict) -> bytes:
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.enums import TA_LEFT

    OBSIDIAN = HexColor("#0c0a09")
    GOLD = HexColor("#c9a96e")
    MUTE = HexColor("#a8a094")

    buf = io.BytesIO()
    doc_tpl = SimpleDocTemplate(buf, pagesize=LETTER, leftMargin=0.9 * inch, rightMargin=0.9 * inch, topMargin=1.0 * inch, bottomMargin=1.0 * inch)
    styles = getSampleStyleSheet()

    def style(name, **kw):
        base = styles["Normal"].clone(name)
        for k, v in kw.items():
            setattr(base, k, v)
        return base

    overline = style("overline", fontName="Helvetica-Bold", fontSize=8, textColor=GOLD, leading=12, spaceAfter=6)
    display_xl = style("display_xl", fontName="Times-Italic", fontSize=42, textColor=OBSIDIAN, leading=44, spaceAfter=20)
    display_md = style("display_md", fontName="Times-Italic", fontSize=18, textColor=OBSIDIAN, leading=22, spaceAfter=10)
    body = style("body", fontName="Helvetica", fontSize=10.5, textColor=OBSIDIAN, leading=16, spaceAfter=10, alignment=TA_LEFT)
    mute = style("mute", fontName="Helvetica", fontSize=9.5, textColor=MUTE, leading=14, spaceAfter=8)

    story = []
    story.append(Paragraph("LUMINA · REHEARSAL REPORT", overline))
    story.append(Paragraph(interview.get("role_title", "Interview"), display_xl))
    meta = f"{interview.get('interview_type','')} · {interview.get('difficulty','')} · {interview.get('completed_at') or interview.get('created_at','')}"
    story.append(Paragraph(meta, mute))
    story.append(Spacer(1, 0.25 * inch))

    overall = fb.get("overall_score", 0)
    story.append(Paragraph("§ Overall Composition", overline))
    story.append(Paragraph(f"<b>{overall}</b> <font size=10 color='#a8a094'>/ 100</font>", display_xl))

    scores = fb.get("scores") or {}
    if scores:
        rows = [["Axis", "Score"]]
        for k, v in scores.items():
            rows.append([k.replace("_", " ").title(), str(v)])
        t = Table(rows, colWidths=[3 * inch, 1.5 * inch])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TEXTCOLOR", (0, 0), (-1, 0), GOLD),
            ("TEXTCOLOR", (0, 1), (-1, -1), OBSIDIAN),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, GOLD),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.25 * inch))

    story.append(Paragraph("§ Editor's Letter", overline))
    story.append(Paragraph(fb.get("summary", "—"), display_md))
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph("§ Strengths", overline))
    for i, s in enumerate(fb.get("strengths") or []):
        story.append(Paragraph(f"<font color='#c9a96e'><i>0{i+1}</i></font>&nbsp;&nbsp;{s}", body))

    story.append(Paragraph("§ Refinements", overline))
    for i, s in enumerate(fb.get("improvements") or []):
        story.append(Paragraph(f"<font color='#c9a96e'><i>0{i+1}</i></font>&nbsp;&nbsp;{s}", body))

    story.append(Paragraph("§ Next Moves", overline))
    for i, s in enumerate(fb.get("next_steps") or []):
        story.append(Paragraph(f"<font color='#c9a96e'><i>0{i+1}</i></font>&nbsp;&nbsp;{s}", body))

    rec = interview.get("recording")
    if rec:
        story.append(Spacer(1, 0.15 * inch))
        story.append(Paragraph("§ Engagement (video)", overline))
        story.append(Paragraph(
            f"Presence {rec.get('presence_pct',0)}% · Speaking {rec.get('speaking_pct',0)}% · Engagement score {rec.get('engagement_score',0)}",
            body,
        ))

    story.append(PageBreak())
    story.append(Paragraph("§ Full Transcript", overline))
    for m in interview.get("messages") or []:
        who = m.get("counsel_name") or ("Counsel" if m.get("role") == "assistant" else "You")
        color = "#c9a96e" if m.get("role") == "assistant" else "#0c0a09"
        story.append(Paragraph(f"<font color='{color}'><b>{who}</b></font>", body))
        story.append(Paragraph((m.get("content") or "").replace("\n", "<br/>"), mute))

    doc_tpl.build(story)
    return buf.getvalue()
