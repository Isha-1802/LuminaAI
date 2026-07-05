"""Lumina server entrypoint — thin. All routes live in routes/*.py."""
import uuid
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import os

from core import init_storage, db, hash_password, mongo_client, now_iso, logger
from routes.auth import router as auth_router
from routes.resumes import router as resumes_router
from routes.interviews import router as interviews_router
from routes.stats import router as stats_router
from routes.kits import router as kits_router
from routes.share import router as share_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="Lumina AI Interview")

app.include_router(auth_router)
app.include_router(resumes_router)
app.include_router(interviews_router)
app.include_router(stats_router)
app.include_router(kits_router)
app.include_router(share_router)


@app.get("/api")
async def root():
    return {"service": "Lumina AI Interview", "status": "ok"}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

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
