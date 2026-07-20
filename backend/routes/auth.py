"""Authentication routes."""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, OAuthError

from core import (
    db, find_user, get_current_user, hash_password, verify_password,
    create_jwt, now_iso, SESSION_EXP_DAYS,
    RegisterInput, LoginInput,
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FRONTEND_URL, BACKEND_URL
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- Setup Google OAuth ---
oauth = OAuth()
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )


@router.post("/register")
async def register(payload: RegisterInput):
    existing = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": payload.email.lower(),
        "name": payload.name,
        "picture": None,
        "role": payload.role,
        "provider": "local",
        "hashed_password": hash_password(payload.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_jwt(user_id)
    return {"token": token, "user": {k: v for k, v in doc.items() if k not in ("hashed_password", "_id")}}


@router.post("/login")
async def login(payload: LoginInput):
    doc = await db.users.find_one({"email": payload.email.lower()})
    if not doc or not doc.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_jwt(doc["user_id"])
    user_out = {k: v for k, v in doc.items() if k not in ("_id", "hashed_password")}
    return {"token": token, "user": user_out}


@router.get("/google")
async def google_login(request: Request):
    """Initiates the Google OAuth flow."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    # Redirect URI must EXACTLY match what's registered in Google Cloud Console.
    # Prefer the explicit BACKEND_URL env var: behind Render/Vercel proxies
    # request.base_url can report http:// instead of https://, which Google rejects.
    base = BACKEND_URL or str(request.base_url).rstrip("/")
    redirect_uri = f"{base}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, response: Response):
    """Handles the callback from Google and logs the user in."""
    try:
        token_data = await oauth.google.authorize_access_token(request)
        user_info = token_data.get('userinfo')
        if not user_info:
            raise OAuthError("No user info returned from Google")
    except OAuthError as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/auth?mode=login&error=google")

    email = user_info["email"].lower()
    
    # Check if user exists
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_info.get("name", existing["name"]), 
                "picture": user_info.get("picture"), 
                "provider": "google"
            }},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": user_info.get("name", email.split("@")[0]),
            "picture": user_info.get("picture"),
            "role": "interviewee",
            "provider": "google",
            "hashed_password": None,
            "created_at": now_iso(),
        })
        
    # Create standard JWT
    jwt_token = create_jwt(user_id)
    
    # Store session in DB for cookie-based auth
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXP_DAYS)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_iso(),
    })
    
    # Redirect to frontend with token in query params so the frontend can store it
    # We don't set cookie here because cross-origin cookie setting during a redirect often fails
    redirect_url = f"{FRONTEND_URL}/auth/callback?token={session_token}"
    return RedirectResponse(url=redirect_url)


@router.post("/google/session")
async def google_session(payload: dict, response: Response):
    """
    Exchanges the query param token for an HTTP-only cookie.
    Called by the frontend AuthCallback page.
    """
    session_token = payload.get("session_id") # frontend sends it as session_id
    if not session_token:
        raise HTTPException(status_code=400, detail="Missing session_id")
        
    sess = await db.user_sessions.find_one({"session_token": session_token})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
        
    user_id = sess["user_id"]
    user_doc = await find_user(user_id)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=SESSION_EXP_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return {"user": user_doc, "session_token": session_token}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


@router.patch("/me/role")
async def update_role(payload: dict, user: dict = Depends(get_current_user)):
    """Allow user to switch role between interviewee/interviewer at will (self-serve)."""
    new_role = (payload or {}).get("role")
    if new_role not in ("interviewee", "interviewer"):
        raise HTTPException(status_code=400, detail="role must be interviewee or interviewer")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": new_role}})
    return await find_user(user["user_id"])
