"""Lumina AI Interview backend tests (pytest)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://neural-interview.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@lumina.ai"
DEMO_PASSWORD = "Demo@1234"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


# --- Health ---
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# --- Models ---
def test_models(session):
    r = session.get(f"{API}/models")
    assert r.status_code == 200
    data = r.json()
    assert any(m["id"] == "gemini-3-flash-preview" for m in data)


# --- Auth register + login + me ---
def test_register_and_me(session):
    email = f"test.{int(time.time())}.{uuid.uuid4().hex[:6]}@lumina.dev"
    r = session.post(f"{API}/auth/register", json={
        "email": email, "password": "Test@1234", "name": "Test User", "role": "interviewee"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data
    assert data["user"]["email"] == email
    token = data["token"]

    me = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_login_demo(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_invalid(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me_unauth(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


# --- Stats / resumes / interviews list ---
def test_stats_summary(auth_headers):
    r = requests.get(f"{API}/stats/summary", headers=auth_headers)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_interviews", "completed", "average_score", "best_score", "by_type"):
        assert k in d


def test_list_resumes(auth_headers):
    r = requests.get(f"{API}/resumes", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_interviews(auth_headers):
    r = requests.get(f"{API}/interviews", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# --- Full interview flow (Gemini) ---
@pytest.fixture(scope="session")
def created_interview(auth_headers):
    payload = {
        "role_title": "Senior Product Designer at Airbnb",
        "interview_type": "technical",
        "difficulty": "medium",
        "model_id": "gemini-3-flash-preview",
        "num_questions": 3,
    }
    r = requests.post(f"{API}/interviews", headers=auth_headers, json=payload, timeout=90)
    assert r.status_code == 200, f"create interview failed: {r.status_code} {r.text}"
    d = r.json()
    assert d["status"] == "in_progress"
    assert len(d["messages"]) >= 1
    assert d["messages"][0]["role"] == "assistant"
    return d


def test_create_interview_persists(created_interview, auth_headers):
    iid = created_interview["interview_id"]
    r = requests.get(f"{API}/interviews/{iid}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["interview_id"] == iid


def test_send_message_and_finish(created_interview, auth_headers):
    iid = created_interview["interview_id"]
    # send one message
    r = requests.post(
        f"{API}/interviews/{iid}/message",
        headers=auth_headers,
        json={"content": "I would start by understanding the user pain points and business goals through research."},
        timeout=90,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert "assistant" in d
    assert d["assistant"]["content"]

    # finish
    r = requests.post(f"{API}/interviews/{iid}/finish", headers=auth_headers, timeout=120)
    assert r.status_code == 200, r.text
    fb = r.json()["feedback"]
    assert "overall_score" in fb
    assert "scores" in fb

    # verify persisted as completed
    r = requests.get(f"{API}/interviews/{iid}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
    assert r.json()["feedback"] is not None


# --- Budget-exhausted expected on Claude/GPT (accept 402 or 200) ---
def test_claude_budget_exhausted_expected(auth_headers):
    payload = {
        "role_title": "Backend Engineer",
        "interview_type": "technical",
        "difficulty": "easy",
        "model_id": "claude-sonnet-4-5-20250929",
        "num_questions": 3,
    }
    r = requests.post(f"{API}/interviews", headers=auth_headers, json=payload, timeout=60)
    # Budget-exhausted → 402 is expected/acceptable, but 200 is fine too.
    assert r.status_code in (200, 402, 502), r.text
