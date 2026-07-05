# Lumina — AI Interview Atelier (PRD)

## Original problem statement (verbatim excerpt)
> AI Interview Platform where users practice technical or HR interviews with AI. Features: user auth, resume upload, AI questions, voice conversation, AI feedback, interview history, score dashboard, PDF report. Login for both interviewee & interviewer with Google/email options. Luxury 3D dark aesthetic, futuristic AI assistant hero, glassmorphism, cinematic. Apple × OpenAI × Linear × Vercel × luxury fashion editorial vibe. User later requested: "not basic blue/purple, luxury editorial" AND "more animations, futuristic 3D core (not an egg), parallax, elaborate homepage".

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (LlmChat, OpenAISpeechToText, OpenAITextToSpeech) + Emergent Object Storage + reportlab (PDF).
- **Frontend**: React 19 (CRA + craco), React Router 7, Framer Motion, React Three Fiber + drei, Tailwind CSS.
- **Auth**: Dual — JWT (email + password with bcrypt) AND Emergent-managed Google OAuth (cookie-based session_token).
- **Storage**: Résumés + webcam recordings via Emergent Object Storage under `lumina-interview/{resumes|recordings}/{user_id}/{uuid}.{ext}`.
- **AI Counsel**: 3 selectable models via Emergent Universal Key. Gemini 3 Flash currently has budget on the shared key. Claude / GPT / OpenAI Whisper/TTS may return 402 with a top-up hint if budget exhausted.

## User personas
- **Interviewee** (default).
- **Interviewer** (role stored on user doc; shared dashboard for now).

## What's implemented (2026-02-04)
### v1.0 — MVP
- Luxury editorial landing page — **obsidian + champagne gold + ivory** palette.
- **Futuristic 3D AI Core** (wireframe icosahedron + solid emissive core + orbital rings + trailed satellites + point-shell + neural links + HUD grid floor + scanning ring + mouse-parallax + corner brackets).
- Homepage sections (12): Hero → houses marquee → animated counters → The Method → Live Interview Demo → Capabilities bento → AI Counsel (with animated stat bars) → Interview Modes → Roadmap timeline → Editorial quote → FAQ accordion → Atelier CTA → Footer.
- Auth: email/password signup+login, Google button (Emergent OAuth), role toggle at signup.
- Dashboard: stats grid, résumé panel (upload PDF/DOCX/TXT), interview history archive.
- Interview flow: composer (title/register/difficulty/model/résumé/questions) → live chat → verdict report.
- Backend: `/api/auth/*`, `/api/resumes*`, `/api/interviews*`, `/api/models`, `/api/stats/summary`.

### v1.1 — Voice, Video, PDF, Streaming (2026-02-04)
- **SSE streaming** (`GET /api/interviews/:id/stream`) — tokens stream in real time via fetch+ReadableStream on the client. Progress bar + typing cursor while composing.
- **Voice mode**:
  - Push-to-talk `<VoiceRecorder>` — captures via MediaRecorder (webm/opus) with live level meter.
  - `POST /api/interviews/:id/message/audio` → Whisper STT (whisper-1) → normal reply pipeline.
  - `POST /api/tts` returns MP3 stream (tts-1, voice `sage`). AI messages auto-play; per-message Replay button; report page has "Hear the letter" button.
- **Webcam recording + engagement**:
  - `<WebcamPanel>` streams local video, samples luminance-variance for face presence + mic-level for speaking, every 500ms.
  - Records via MediaRecorder (webm/vp9), uploads to `POST /api/interviews/:id/recording` with presence/speaking %.
  - Backend computes engagement score = (presence + speaking) / 2 and stores under `interviews.recording`.
  - Report page renders inline video player + engagement / presence / speaking bars.
- **PDF export** (`GET /api/interviews/:id/report/pdf`) — reportlab-generated editorial report: title, overall score, per-axis table, editor's letter, strengths, refinements, next moves, engagement metrics, full transcript.

### Test coverage
- Backend pytest: 18/18 (12 v1 + 6 v1.1 new features).
- Frontend E2E via testing_agent_v3: full flow login → interview → SSE stream → voice toggle → webcam toggle → finish → report → PDF download → TTS playback.

## Deferred (P1 backlog)
- Interviewer console (separate view when `role=interviewer`).
- Company-specific atelier (Stripe atelier, OpenAI atelier).
- Panel simulations (multi-counsel).
- Offer negotiation coach.
- Rate limiting + Redis caching.
- Anonymised public leaderboard / shareable Open Graph score cards.

## Deferred (P2)
- Refactor server.py → routers (auth, interviews, voice, recording, reports).
- Replace in-band SSE error sentinel with typed events.
- asyncio.Lock around object-storage init.
- Refactor transcribe_and_reply / send_message shared pipeline.

## Known limitations
- Emergent Universal Key budget may exhaust for Anthropic (Claude), OpenAI (GPT / Whisper / TTS). Gemini 3 Flash always works today. Backend surfaces 402 with a clear top-up message. **Top up at Profile → Universal Key → Add Balance**.
- Engagement analysis is intentionally simple (luminance-variance + mic level heuristic) — no third-party face-recognition SDK. Solid signal but not clinical.
