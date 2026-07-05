"""Tests for iteration 2: SSE streaming, PDF export, TTS, audio transcription, webcam recording."""
import os
import json
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://neural-interview.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@lumina.ai"
DEMO_PASSWORD = "Demo@1234"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def interview(auth_headers):
    payload = {
        "role_title": "Staff Engineer at Stripe (iter2 tests)",
        "interview_type": "technical",
        "difficulty": "easy",
        "model_id": "gemini-3-flash-preview",
        "num_questions": 3,
    }
    r = requests.post(f"{API}/interviews", headers={**auth_headers, "Content-Type": "application/json"},
                      json=payload, timeout=90)
    assert r.status_code == 200, r.text
    return r.json()


# --- SSE streaming ---
def test_sse_streaming(auth_headers, interview):
    iid = interview["interview_id"]
    url = f"{API}/interviews/{iid}/stream"
    with requests.get(url, headers=auth_headers, params={"content": "Tell me briefly."}, stream=True, timeout=120) as r:
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "text/event-stream" in ct, ct
        deltas = 0
        done_payload = None
        current_event = None
        for raw in r.iter_lines(decode_unicode=True):
            if raw is None:
                continue
            if raw == "":
                current_event = None
                continue
            if raw.startswith("event:"):
                current_event = raw.split(":", 1)[1].strip()
            elif raw.startswith("data:"):
                data_str = raw.split(":", 1)[1].strip()
                if current_event == "delta":
                    deltas += 1
                elif current_event == "done":
                    done_payload = json.loads(data_str)
                elif current_event == "error":
                    pytest.fail(f"SSE error frame: {data_str}")
        assert deltas > 0, "no delta frames received"
        assert done_payload is not None, "no done frame received"
        assert "assistant" in done_payload
        assert "content" in done_payload["assistant"]
        assert "completed" in done_payload
        assert isinstance(done_payload["completed"], bool)


# --- Webcam recording upload + list + download ---
def test_recording_upload_and_metadata(auth_headers, interview):
    iid = interview["interview_id"]
    fake_video = b"\x1aE\xdf\xa3" + b"x" * 2048
    files = {"file": ("cam.webm", fake_video, "video/webm")}
    data = {"presence_pct": "80", "speaking_pct": "60", "duration_seconds": "45"}
    r = requests.post(f"{API}/interviews/{iid}/recording", headers=auth_headers,
                      files=files, data=data, timeout=60)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    rec = body["recording"]
    assert rec["presence_pct"] == 80.0
    assert rec["speaking_pct"] == 60.0
    assert rec["engagement_score"] == 70.0

    # verify interview doc contains recording object
    r = requests.get(f"{API}/interviews/{iid}", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    doc = r.json()
    assert "recording" in doc and doc["recording"]
    assert "engagement_score" in doc["recording"]


def test_recording_download(auth_headers, interview):
    iid = interview["interview_id"]
    r = requests.get(f"{API}/interviews/{iid}/recording", headers=auth_headers, timeout=60)
    assert r.status_code == 200
    assert len(r.content) > 0
    ct = r.headers.get("content-type", "")
    assert "video" in ct or "octet" in ct or "webm" in ct, ct


# --- PDF export ---
def test_pdf_export(auth_headers, interview):
    iid = interview["interview_id"]
    # finish the interview so feedback is populated
    r = requests.post(f"{API}/interviews/{iid}/finish", headers=auth_headers, timeout=120)
    assert r.status_code == 200, r.text

    r = requests.get(f"{API}/interviews/{iid}/report/pdf", headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("application/pdf")
    cd = r.headers.get("content-disposition", "")
    assert "attachment" in cd.lower()
    assert r.content.startswith(b"%PDF-"), r.content[:20]
    assert len(r.content) > 1000


# --- TTS (may 402) ---
def test_tts_endpoint(auth_headers):
    r = requests.post(f"{API}/tts", headers={**auth_headers, "Content-Type": "application/json"},
                      json={"text": "Hello world", "voice": "sage"}, timeout=60)
    assert r.status_code in (200, 402, 502), f"unexpected {r.status_code}: {r.text}"
    if r.status_code == 200:
        assert r.headers.get("content-type", "").startswith("audio/")
        assert len(r.content) > 100
    elif r.status_code == 402:
        detail = r.json().get("detail", "").lower()
        assert "budget" in detail or "exhaust" in detail


# --- Audio transcription (empty file → 400; OR 402 if budget) ---
def test_audio_transcription_empty(auth_headers, interview):
    # Interview may already be completed by prior test; that's fine — endpoint should
    # still validate empty file BEFORE hitting the message pipeline, since we read data first.
    # We use a fresh interview instead to avoid the "already completed" branch making noise.
    payload = {
        "role_title": "Tiny audio test",
        "interview_type": "technical",
        "difficulty": "easy",
        "model_id": "gemini-3-flash-preview",
        "num_questions": 3,
    }
    r = requests.post(f"{API}/interviews", headers={**auth_headers, "Content-Type": "application/json"},
                      json=payload, timeout=90)
    assert r.status_code == 200
    iid = r.json()["interview_id"]

    # Empty file
    files = {"file": ("empty.webm", b"", "audio/webm")}
    r = requests.post(f"{API}/interviews/{iid}/message/audio", headers=auth_headers, files=files, timeout=60)
    assert r.status_code in (400, 402), f"expected 400 or 402, got {r.status_code}: {r.text}"

    # Tiny non-empty file (whisper will likely fail; expect 400/402/502 but not 500 crash)
    files = {"file": ("tiny.webm", b"x" * 128, "audio/webm")}
    r = requests.post(f"{API}/interviews/{iid}/message/audio", headers=auth_headers, files=files, timeout=60)
    assert r.status_code in (400, 402, 502), f"unexpected {r.status_code}: {r.text}"
