"""Iteration 3 tests: Ateliers, Panels, Kits CRUD, Share flow, Reviewer notes, role toggle.

Also includes a small regression pass to confirm iter1/iter2 endpoints still function
after the server.py refactor into core.py + routes/*.
"""
import os
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://neural-interview.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO = ("demo@lumina.ai", "Demo@1234")
REVIEWER = ("reviewer@lumina.ai", "Review@1234")
MODEL_ID = "gemini-3-flash-preview"


# -------------------- helpers --------------------
def _login(email: str, password: str) -> dict:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def demo_headers():
    return _login(*DEMO)


@pytest.fixture(scope="module")
def reviewer_headers():
    return _login(*REVIEWER)


# -------------------- regression basics --------------------
def test_regression_models_and_ateliers(demo_headers):
    r = requests.get(f"{API}/models", headers=demo_headers, timeout=30)
    assert r.status_code == 200 and isinstance(r.json(), list) and len(r.json()) > 0

    r = requests.get(f"{API}/ateliers", headers=demo_headers, timeout=30)
    assert r.status_code == 200
    ateliers = r.json()
    assert isinstance(ateliers, list) and len(ateliers) == 9, f"expected 9 ateliers got {len(ateliers)}"
    required = {"id", "name", "tagline", "accent", "difficulty", "topics", "culture_notes"}
    ids = set()
    for a in ateliers:
        missing = required - set(a.keys())
        assert not missing, f"atelier missing fields {missing}: {a}"
        ids.add(a["id"])
    for expected_id in ("stripe", "airbnb", "anthropic", "openai", "vercel", "linear", "notion", "ramp", "figma"):
        assert expected_id in ids, f"missing atelier id {expected_id}"


def test_regression_stats_summary(demo_headers):
    r = requests.get(f"{API}/stats/summary", headers=demo_headers, timeout=30)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, dict)


def test_regression_auth_me(demo_headers):
    r = requests.get(f"{API}/auth/me", headers=demo_headers, timeout=30)
    assert r.status_code == 200
    me = r.json()
    assert me["email"] == DEMO[0]


# -------------------- atelier attached to interview --------------------
def test_create_interview_with_atelier(demo_headers):
    r = requests.post(f"{API}/interviews", headers=demo_headers, json={
        "role_title": "TEST_atelier stripe eng",
        "interview_type": "technical",
        "difficulty": "easy",
        "model_id": MODEL_ID,
        "num_questions": 3,
        "atelier_id": "stripe",
    }, timeout=90)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["atelier_id"] == "stripe"


# -------------------- panel interviews --------------------
@pytest.fixture(scope="module")
def panel_interview(demo_headers):
    panel = [
        {"name": "Ada", "role": "Engineering Manager", "style": "warm"},
        {"name": "Ben", "role": "Staff Engineer", "style": "probing"},
        {"name": "Cleo", "role": "Cross-functional partner", "style": "product-minded"},
    ]
    r = requests.post(f"{API}/interviews", headers=demo_headers, json={
        "role_title": "TEST_panel role",
        "interview_type": "panel",
        "difficulty": "easy",
        "model_id": MODEL_ID,
        "num_questions": 4,
        "atelier_id": "airbnb",
        "panel_config": panel,
    }, timeout=120)
    assert r.status_code == 200, r.text
    doc = r.json()
    return doc, panel


def test_panel_interview_created_with_first_counsel(panel_interview):
    doc, panel = panel_interview
    assert doc["interview_type"] == "panel"
    assert doc.get("panel_config") == panel
    first_msg = doc["messages"][0]
    assert first_msg["role"] == "assistant"
    assert first_msg.get("counsel_name") == panel[0]["name"], f"expected {panel[0]['name']}, got {first_msg}"


def test_panel_default_panel_when_missing(demo_headers):
    r = requests.post(f"{API}/interviews", headers=demo_headers, json={
        "role_title": "TEST_panel default",
        "interview_type": "panel",
        "difficulty": "easy",
        "model_id": MODEL_ID,
        "num_questions": 3,
    }, timeout=120)
    assert r.status_code == 200, r.text
    doc = r.json()
    panel = doc.get("panel_config")
    assert isinstance(panel, list) and 2 <= len(panel) <= 4
    for p in panel:
        assert "name" in p and "role" in p


def test_panel_rotation_via_messages(demo_headers, panel_interview):
    doc, panel = panel_interview
    iid = doc["interview_id"]

    r = requests.post(f"{API}/interviews/{iid}/message", headers=demo_headers,
                      json={"content": "First answer."}, timeout=120)
    assert r.status_code == 200, r.text
    reply1 = r.json()["assistant"]
    assert reply1.get("counsel_name") == panel[1]["name"], f"expected {panel[1]['name']}, got {reply1}"

    r = requests.post(f"{API}/interviews/{iid}/message", headers=demo_headers,
                      json={"content": "Second answer."}, timeout=120)
    assert r.status_code == 200, r.text
    reply2 = r.json()["assistant"]
    assert reply2.get("counsel_name") == panel[2]["name"], f"expected {panel[2]['name']}, got {reply2}"


def test_panel_sse_stream_has_counsel_meta(demo_headers):
    # fresh panel interview so it's not yet completed
    panel = [
        {"name": "Xerxes", "role": "EM", "style": "warm"},
        {"name": "Yara", "role": "Staff", "style": "probing"},
    ]
    r = requests.post(f"{API}/interviews", headers=demo_headers, json={
        "role_title": "TEST_panel sse",
        "interview_type": "panel",
        "difficulty": "easy",
        "model_id": MODEL_ID,
        "num_questions": 3,
        "panel_config": panel,
    }, timeout=120)
    assert r.status_code == 200
    iid = r.json()["interview_id"]

    url = f"{API}/interviews/{iid}/stream"
    with requests.get(url, headers={"Authorization": demo_headers["Authorization"]},
                      params={"content": "Ready."}, stream=True, timeout=120) as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")
        delta_counsel_names = set()
        done_payload = None
        cur_event = None
        for raw in resp.iter_lines(decode_unicode=True):
            if raw is None or raw == "":
                cur_event = None
                continue
            if raw.startswith("event:"):
                cur_event = raw.split(":", 1)[1].strip()
            elif raw.startswith("data:"):
                data_str = raw.split(":", 1)[1].strip()
                if cur_event == "delta":
                    try:
                        obj = json.loads(data_str)
                        meta = obj.get("meta") or {}
                        if meta.get("counsel_name"):
                            delta_counsel_names.add(meta["counsel_name"])
                    except Exception:
                        pass
                elif cur_event == "done":
                    done_payload = json.loads(data_str)
        assert done_payload is not None, "no done frame"
        assistant = done_payload.get("assistant", {})
        assert assistant.get("counsel_name") in (panel[1]["name"], panel[0]["name"]), assistant
        # delta frames should carry the counsel_name meta (best-effort)
        assert delta_counsel_names, f"no counsel_name on delta meta; deltas seen but no meta"


# -------------------- Kits CRUD --------------------
def test_kits_crud(reviewer_headers):
    # start clean-ish list
    r = requests.get(f"{API}/kits", headers=reviewer_headers, timeout=30)
    assert r.status_code == 200
    initial_ids = {k["kit_id"] for k in r.json()}

    payload = {
        "name": "TEST_Stripe Staff Kit",
        "role_title": "Staff Engineer",
        "interview_type": "technical",
        "difficulty": "medium",
        "num_questions": 5,
        "atelier_id": "stripe",
        "notes": "focus on payments idempotency",
    }
    r = requests.post(f"{API}/kits", headers=reviewer_headers, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    kit = r.json()
    kit_id = kit["kit_id"]
    assert kit_id.startswith("kit_")
    assert kit["name"] == payload["name"]
    assert kit["atelier_id"] == "stripe"

    # LIST
    r = requests.get(f"{API}/kits", headers=reviewer_headers, timeout=30)
    assert r.status_code == 200
    ids = {k["kit_id"] for k in r.json()}
    assert kit_id in ids and kit_id not in initial_ids

    # GET single
    r = requests.get(f"{API}/kits/{kit_id}", headers=reviewer_headers, timeout=30)
    assert r.status_code == 200
    assert r.json()["kit_id"] == kit_id

    # UPDATE
    updated_payload = {**payload, "name": "TEST_Stripe Staff Kit v2", "num_questions": 6}
    r = requests.put(f"{API}/kits/{kit_id}", headers=reviewer_headers, json=updated_payload, timeout=30)
    assert r.status_code == 200, r.text
    # verify persisted
    r = requests.get(f"{API}/kits/{kit_id}", headers=reviewer_headers, timeout=30)
    assert r.status_code == 200
    got = r.json()
    assert got["name"] == "TEST_Stripe Staff Kit v2"
    assert got["num_questions"] == 6

    # DELETE (soft)
    r = requests.delete(f"{API}/kits/{kit_id}", headers=reviewer_headers, timeout=30)
    assert r.status_code == 200

    r = requests.get(f"{API}/kits", headers=reviewer_headers, timeout=30)
    assert r.status_code == 200
    ids_after = {k["kit_id"] for k in r.json()}
    assert kit_id not in ids_after, "soft-deleted kit still visible in list"

    r = requests.get(f"{API}/kits/{kit_id}", headers=reviewer_headers, timeout=30)
    assert r.status_code == 404


def test_demo_user_has_empty_kits_isolation(demo_headers):
    """Kits are per-owner; demo user should not see reviewer's kits."""
    r = requests.get(f"{API}/kits", headers=demo_headers, timeout=30)
    assert r.status_code == 200
    kits = r.json()
    # Not asserting empty (demo could have created), but assert none belong to reviewer
    for k in kits:
        assert not k["name"].startswith("TEST_Stripe Staff Kit"), "kit leakage across users"


def test_create_interview_with_kit_id(reviewer_headers):
    # create a kit
    r = requests.post(f"{API}/kits", headers=reviewer_headers, json={
        "name": "TEST_kit for iv",
        "role_title": "Backend Engineer",
        "interview_type": "technical",
        "difficulty": "easy",
        "num_questions": 3,
        "atelier_id": "linear",
    }, timeout=30)
    assert r.status_code == 200
    kit_id = r.json()["kit_id"]

    r = requests.post(f"{API}/interviews", headers=reviewer_headers, json={
        "role_title": "Backend Engineer",
        "interview_type": "technical",
        "difficulty": "easy",
        "model_id": MODEL_ID,
        "num_questions": 3,
        "atelier_id": "linear",
        "kit_id": kit_id,
    }, timeout=90)
    assert r.status_code == 200, r.text
    assert r.json().get("kit_id") == kit_id

    # cleanup
    requests.delete(f"{API}/kits/{kit_id}", headers=reviewer_headers, timeout=30)


# -------------------- Share flow --------------------
@pytest.fixture(scope="module")
def shared_interview(demo_headers):
    """Create + finish an interview under demo, then share it."""
    r = requests.post(f"{API}/interviews", headers=demo_headers, json={
        "role_title": "TEST_share role",
        "interview_type": "technical",
        "difficulty": "easy",
        "model_id": MODEL_ID,
        "num_questions": 3,
    }, timeout=90)
    assert r.status_code == 200
    iid = r.json()["interview_id"]
    r = requests.post(f"{API}/interviews/{iid}/finish", headers=demo_headers, timeout=120)
    assert r.status_code == 200, r.text

    r = requests.post(f"{API}/interviews/{iid}/share", headers=demo_headers, timeout=30)
    assert r.status_code == 200, r.text
    token = r.json()["share_token"]
    assert token.startswith("shr_")
    return iid, token


def test_public_share_get(shared_interview):
    iid, token = shared_interview
    # NO AUTH
    r = requests.get(f"{API}/share/{token}", timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["share_token"] == token
    assert body["status"] in ("completed", "in_progress")
    assert "messages" in body
    assert "feedback" in body
    # system_prompt & user_id must be stripped
    assert "system_prompt" not in body
    assert "user_id" not in body


def test_reviewer_note_flow(shared_interview, reviewer_headers):
    iid, token = shared_interview
    r = requests.post(f"{API}/share/{token}/note", headers=reviewer_headers,
                      json={"verdict": "hire", "note": "TEST_Strong systems thinking"}, timeout=30)
    assert r.status_code in (200, 201), r.text
    note = r.json()
    assert note["verdict"] == "hire"
    assert note["interview_id"] == iid

    r = requests.get(f"{API}/reviews/inbox", headers=reviewer_headers, timeout=30)
    assert r.status_code == 200
    inbox = r.json()
    assert any(n.get("note") == "TEST_Strong systems thinking" for n in inbox), "note not found in inbox"


def test_share_revoke(demo_headers, shared_interview):
    iid, token = shared_interview
    r = requests.delete(f"{API}/interviews/{iid}/share", headers=demo_headers, timeout=30)
    assert r.status_code == 200
    r = requests.get(f"{API}/share/{token}", timeout=30)
    assert r.status_code == 404, f"share still readable after revoke: {r.status_code}"


# -------------------- Role toggle --------------------
def test_role_toggle_self_serve(demo_headers):
    r = requests.patch(f"{API}/auth/me/role", headers=demo_headers,
                       json={"role": "interviewer"}, timeout=30)
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "interviewer"

    r = requests.get(f"{API}/auth/me", headers=demo_headers, timeout=30)
    assert r.status_code == 200
    assert r.json()["role"] == "interviewer"

    # revert
    r = requests.patch(f"{API}/auth/me/role", headers=demo_headers,
                       json={"role": "interviewee"}, timeout=30)
    assert r.status_code == 200
    assert r.json()["role"] == "interviewee"

    # invalid
    r = requests.patch(f"{API}/auth/me/role", headers=demo_headers,
                       json={"role": "admin"}, timeout=30)
    assert r.status_code == 400
