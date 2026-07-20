"""Lumina server entrypoint — thin. All routes live in routes/*.py."""
import uuid
import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os

from core import db, hash_password, mongo_client, now_iso, logger
from routes.auth import router as auth_router
from routes.resumes import router as resumes_router
from routes.interviews import router as interviews_router
from routes.stats import router as stats_router
from routes.kits import router as kits_router
from routes.share import router as share_router
from routes.profiles import router as profiles_router
from routes.bookings import router as bookings_router
from routes.chat import router as chat_router
from routes.reviews import router as reviews_router
from routes.notifications import router as notifications_router
from routes.daily import router as daily_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="Lumina AI Interview")

app.include_router(auth_router)
app.include_router(daily_router)
app.include_router(resumes_router)
app.include_router(interviews_router)
app.include_router(stats_router)
app.include_router(kits_router)
app.include_router(share_router)
app.include_router(profiles_router)
app.include_router(bookings_router)
app.include_router(chat_router)
app.include_router(reviews_router)
app.include_router(notifications_router)

# Mount uploads directory for profile pictures and media
from core import UPLOAD_DIR
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/api")
async def root():
    return {"service": "Lumina AI Interview", "status": "ok"}


# CORS. Browsers reject `allow_origins=["*"]` together with credentials, so when
# no explicit origins are configured we fall back to a permissive regex that still
# allows cookies. In production, set CORS_ORIGINS to your exact frontend URL(s).
_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=_cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origin_regex=".*",
        allow_methods=["*"],
        allow_headers=["*"],
    )
app.add_middleware(SessionMiddleware, secret_key=os.environ.get("JWT_SECRET", "super-secret-default-key"))


@app.on_event("startup")
async def startup():
    # Local storage directory is automatically ensured in core.py

    demo_email = "demo@lumina.ai"
    exists = await db.users.find_one({"email": demo_email})
    if not exists:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": demo_email,
            "name": "Ada Lovelace",
            "picture": None,
            "role": "interviewee",
            "provider": "local",
            "hashed_password": hash_password("Demo@1234"),
            "created_at": now_iso(),
        })
        logger.info("Seeded demo user demo@lumina.ai / Demo@1234")

    interviewer_email = "reviewer@lumina.ai"
    exists = await db.users.find_one({"email": interviewer_email})
    if not exists:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": interviewer_email,
            "name": "Grace Hopper",
            "picture": None,
            "role": "interviewer",
            "provider": "local",
            "hashed_password": hash_password("Review@1234"),
            "created_at": now_iso(),
        })
        logger.info("Seeded interviewer user reviewer@lumina.ai / Review@1234")


@app.on_event("shutdown")
async def shutdown():
    mongo_client().close()
