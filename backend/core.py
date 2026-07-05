"""Lumina shared core: config, db, models, deps, storage, llm, helpers, pdf."""
from __future__ import annotations

import os
import io
import json
import uuid
import bcrypt
import jwt
import logging
from pathlib import Path
from typing import Optional, Literal, List
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, Request, Response
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from groq import Groq, AsyncGroq

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Config ---
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "lumina_interview")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "supersecretkey")
APP_NAME = os.environ.get("APP_NAME", "lumina-interview")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3001")
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads"))

JWT_ALG = "HS256"
JWT_EXP_DAYS = 30
SESSION_EXP_DAYS = 7

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger("lumina")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# --- Available models (Groq) ---
AVAILABLE_MODELS = [
    {"id": "llama-3.3-70b-versatile", "provider": "groq", "label": "Llama 3.3 70B", "family": "Meta"},
    {"id": "llama-3.1-8b-instant", "provider": "groq", "label": "Llama 3.1 8B (Fast)", "family": "Meta"},
    {"id": "mixtral-8x7b-32768", "provider": "groq", "label": "Mixtral 8x7B", "family": "Mistral"},
    {"id": "gemma2-9b-it", "provider": "groq", "label": "Gemma 2 9B", "family": "Google"},
]

# --- Curated Ateliers (company presets) ---
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
# Local File Storage
# =======================
def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Save bytes to local filesystem under UPLOAD_DIR."""
    file_path = UPLOAD_DIR / path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(data)
    return {"path": str(path), "size": len(data)}


def get_object(path: str):
    """Read bytes from local filesystem."""
    file_path = UPLOAD_DIR / path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    data = file_path.read_bytes()
    # Basic content type detection
    suffix = file_path.suffix.lower()
    ct_map = {".pdf": "application/pdf", ".webm": "video/webm", ".mp4": "video/mp4",
              ".png": "image/png", ".jpg": "image/jpeg", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
    content_type = ct_map.get(suffix, "application/octet-stream")
    return data, content_type


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


class UserProfileInput(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    picture: Optional[str] = None
    headline: Optional[str] = Field(default=None, max_length=120)
    about: Optional[str] = Field(default=None, max_length=1000)
    current_company: Optional[str] = Field(default=None, max_length=80)
    previous_companies: Optional[List[str]] = None
    years_of_experience: Optional[int] = Field(default=None, ge=0)
    expertise: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    hourly_rate: Optional[int] = Field(default=None, ge=0)
    is_available: Optional[bool] = None
    available_slots: Optional[List[str]] = None
    linkedin_url: Optional[str] = Field(default=None, max_length=200)

class BookingInput(BaseModel):
    interviewer_id: str
    start_time: str
    end_time: str


class ReviewInput(BaseModel):
    booking_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)


# ---------------------------------------------------------------------------
# Monetization Tier System
# ---------------------------------------------------------------------------
# Works like YouTube/Instagram monetization — performance unlocks earnings.
# Interviewers do NOT set their own rate; the platform assigns it based on
# completed interview count and average rating.
# ---------------------------------------------------------------------------

MONETIZATION_TIERS = [
    # name, min_interviews, min_avg_rating, rate_inr, next_goal_label
    {
        "tier": "Building",
        "min_interviews": 0,
        "min_rating": 0.0,
        "rate_inr": 0,
        "is_monetized": False,
        "color": "#a8a094",
        "description": "Complete 5 interviews to unlock earnings.",
    },
    {
        "tier": "Bronze",
        "min_interviews": 5,
        "min_rating": 3.5,
        "rate_inr": 599,
        "is_monetized": True,
        "color": "#cd7f32",
        "description": "Keep a 4.0+ rating across 15 interviews to reach Silver.",
    },
    {
        "tier": "Silver",
        "min_interviews": 15,
        "min_rating": 4.0,
        "rate_inr": 1199,
        "is_monetized": True,
        "color": "#c0c0c0",
        "description": "Maintain 4.5+ rating across 30 interviews to reach Gold.",
    },
    {
        "tier": "Gold",
        "min_interviews": 30,
        "min_rating": 4.5,
        "rate_inr": 2499,
        "is_monetized": True,
        "color": "#c9a96e",
        "description": "Achieve 4.8+ rating across 50 interviews to reach Elite.",
    },
    {
        "tier": "Elite",
        "min_interviews": 50,
        "min_rating": 4.8,
        "rate_inr": 4999,
        "is_monetized": True,
        "color": "#f2ece0",
        "description": "You have reached the highest tier. Maximum earnings unlocked.",
    },
]


def compute_monetization_tier(interview_count: int, avg_rating: float) -> dict:
    """
    Given an interviewer's completed interview count and average rating,
    return the highest tier they qualify for.
    Tiers are evaluated highest-first so we award the best applicable tier.
    """
    best_tier = MONETIZATION_TIERS[0]  # Default: Building
    for tier in reversed(MONETIZATION_TIERS):
        if interview_count >= tier["min_interviews"] and avg_rating >= tier["min_rating"]:
            best_tier = tier
            break
    return best_tier


class CounselPersona(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    role: str = Field(min_length=1, max_length=80)
    style: Optional[str] = Field(default=None, max_length=180)


class InterviewCreateInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    role_title: str = Field(min_length=1)
    interview_type: Literal["technical", "behavioral", "coding", "hr", "panel"] = "technical"
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    model_id: str = "llama-3.3-70b-versatile"
    resume_id: Optional[str] = None
    num_questions: int = Field(default=5, ge=3, le=12)
    atelier_id: Optional[str] = None
    panel_config: Optional[List[CounselPersona]] = None
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
    return {k: v for k, v in doc.items() if k not in ("_id",)}


def extract_resume_text(filename: str, data: bytes) -> str:
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
    # 1. Session cookie
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

    # 2. Bearer JWT
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
# Groq LLM helpers
# =======================
def _resolve_groq_model(model_id: str) -> str:
    """Return a valid Groq model ID, falling back to default."""
    valid_ids = {m["id"] for m in AVAILABLE_MODELS}
    return model_id if model_id in valid_ids else "llama-3.3-70b-versatile"


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
    """Send a chat message via Groq and return the response string."""
    model = _resolve_groq_model(model_id)
    client = AsyncGroq(api_key=GROQ_API_KEY)
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        msg = str(e).lower()
        if "rate" in msg or "limit" in msg:
            raise HTTPException(status_code=429, detail="Groq rate limit hit. Please wait a moment and try again.")
        raise HTTPException(status_code=502, detail=f"AI provider error: {str(e)[:200]}")


async def llm_stream(model_id: str, session_id: str, system_prompt: str, user_text: str):
    """Stream chat tokens via Groq."""
    model = _resolve_groq_model(model_id)
    client = AsyncGroq(api_key=GROQ_API_KEY)
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            temperature=0.7,
            max_tokens=1024,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception as e:
        msg = str(e).lower()
        if "rate" in msg or "limit" in msg:
            yield "[[ERROR:RATE_LIMITED]]"
        else:
            yield f"[[ERROR:{str(e)[:180]}]]"


async def groq_stt(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio using Groq's Whisper large-v3."""
    client = AsyncGroq(api_key=GROQ_API_KEY)
    try:
        transcription = await client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model="whisper-large-v3",
            response_format="text",
            language="en",
        )
        return str(transcription).strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)[:200]}")


# Keep these names for backward compat with interview routes
def openai_stt():
    """Returns a shim that routes to Groq Whisper."""
    class GroqSTTShim:
        async def transcribe(self, file, model="whisper-large-v3", response_format="json", language="en"):
            data = file.read() if hasattr(file, "read") else file
            name = getattr(file, "name", "audio.webm")
            text = await groq_stt(data, name)
            return type("T", (), {"text": text})()
    return GroqSTTShim()


def openai_tts():
    """TTS shim — returns None; handled client-side by browser SpeechSynthesis."""
    class NoopTTS:
        async def generate_speech(self, text, model="", voice="", response_format="mp3"):
            raise HTTPException(
                status_code=501,
                detail="Server-side TTS is not available in local mode. The frontend uses browser SpeechSynthesis instead."
            )
    return NoopTTS()


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
