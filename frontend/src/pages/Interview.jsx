import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API, getToken } from "@/lib/api";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Flag, Volume2, VolumeX, Camera, Keyboard, Waves } from "lucide-react";
import { toast } from "sonner";
import VoiceRecorder from "@/components/VoiceRecorder";
import WebcamPanel from "@/components/WebcamPanel";

export default function Interview() {
  const { id } = useParams();
  const nav = useNavigate();
  const [interview, setInterview] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [webcamOn, setWebcamOn] = useState(false);
  const audioElRef = useRef(null);
  const scrollRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/interviews/${id}`);
      setInterview(data);
      if (data.status === "completed") {
        nav(`/interview/${id}/report`, { replace: true });
      }
    } catch (e) {
      toast.error("Could not load the room");
      nav("/dashboard");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [interview?.messages?.length, streamingText]);

  // ============= TTS playback =============
  const playAudio = async (text) => {
    if (!ttsOn || !text) return;
    try {
      const { data } = await api.post("/tts", { text, voice: "sage" }, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      if (audioElRef.current) {
        audioElRef.current.src = url;
        audioElRef.current.play().catch(() => {});
      }
    } catch (e) {
      // silent — user still sees the text
    }
  };

  // Speak the very first counsel message on load
  useEffect(() => {
    if (!interview || !ttsOn) return;
    if (interview.messages?.length === 1 && interview.messages[0].role === "assistant") {
      playAudio(interview.messages[0].content);
    }
    // eslint-disable-next-line
  }, [interview?.interview_id]);

  // ============= Send via SSE stream =============
  const sendStream = async (content) => {
    if (!content.trim() || sending) return;
    setInterview((p) => ({ ...p, messages: [...p.messages, { role: "user", content, ts: new Date().toISOString() }] }));
    setSending(true);
    setStreamingText("");
    try {
      const token = getToken();
      const url = `${API}/interviews/${id}/stream?content=${encodeURIComponent(content)}`;
      const resp = await fetch(url, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok || !resp.body) throw new Error(`Stream failed: ${resp.status}`);
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      let payload = null;
      let errored = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        // SSE frames separated by blank line
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let event = "message";
          let data = "";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          try {
            const j = JSON.parse(data);
            if (event === "delta") {
              full += j.content || "";
              setStreamingText(full);
            } else if (event === "done") {
              payload = j;
            } else if (event === "error") {
              toast.error(j.message?.includes("BUDGET") ? "AI budget exhausted — top up in Profile → Universal Key." : "Stream error");
              errored = true;
            }
          } catch {}
        }
      }
      setStreamingText("");
      if (errored) return;
      if (payload?.assistant) {
        setInterview((p) => ({ ...p, messages: [...p.messages, payload.assistant] }));
        if (ttsOn) playAudio(payload.assistant.content);
      }
      if (payload?.completed) {
        toast.success("The rehearsal has concluded — writing the verdict");
        await finalizeRecording();
        setTimeout(() => nav(`/interview/${id}/report`), 900);
      }
    } catch (e) {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  // ============= Voice submit =============
  const submitVoice = async (blob) => {
    if (!blob || sending) return;
    setSending(true);
    // Optimistic "you: (voice)" placeholder
    setInterview((p) => ({ ...p, messages: [...p.messages, { role: "user", content: "🎙 Transcribing your voice…", ts: new Date().toISOString(), pending: true }] }));
    try {
      const fd = new FormData();
      fd.append("file", blob, "answer.webm");
      const { data } = await api.post(`/interviews/${id}/message/audio`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      // Replace pending message with transcript, then append assistant reply
      setInterview((p) => {
        const msgs = [...p.messages];
        const idx = msgs.findLastIndex ? msgs.findLastIndex((m) => m.pending) : (() => { for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].pending) return i; return -1; })();
        // We can't know the transcript from api.post response since transcribe_and_reply returns {assistant, completed}
        if (idx >= 0) msgs.splice(idx, 1);
        return { ...p, messages: [...msgs, data.assistant] };
      });
      if (ttsOn) playAudio(data.assistant.content);
      // Refresh interview to get transcript-as-message from server
      load();
      if (data.completed) {
        toast.success("Concluded — writing the verdict");
        await finalizeRecording();
        setTimeout(() => nav(`/interview/${id}/report`), 900);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Voice transcription failed");
      // remove pending
      setInterview((p) => ({ ...p, messages: p.messages.filter((m) => !m.pending) }));
    } finally {
      setSending(false);
    }
  };

  const finalizeRecording = async () => {
    // Turn off webcam & upload recording via the panel's callback
    if (webcamRef.current?.stopAndUpload) {
      await webcamRef.current.stopAndUpload();
    }
  };

  const webcamRef = useRef(null);
  const handleWebcamStop = async (payload) => {
    if (!payload || !payload.blob) return;
    try {
      const fd = new FormData();
      fd.append("file", payload.blob, "recording.webm");
      fd.append("presence_pct", payload.presencePct);
      fd.append("speaking_pct", payload.speakingPct);
      fd.append("duration_seconds", payload.duration);
      await api.post(`/interviews/${id}/recording`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    } catch {}
  };

  const finish = async () => {
    setFinishing(true);
    try {
      await finalizeRecording();
      await api.post(`/interviews/${id}/finish`);
      nav(`/interview/${id}/report`);
    } catch (e) {
      toast.error("Could not finalise");
    } finally {
      setFinishing(false);
    }
  };

  if (!interview) {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0] flex items-center justify-center" data-testid="interview-loading">
        <Loader2 size={22} className="animate-spin text-[#c68b73]" />
      </div>
    );
  }

  const qCount = interview.messages.filter((m) => m.role === "assistant").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]" data-testid="interview-page">
      <Navbar />
      <AmbientBackground variant="quiet" parallax={false} />
      <audio ref={audioElRef} className="hidden" />
      <div className="pt-[84px] max-w-[1200px] mx-auto px-4 md:px-8 pb-6 grid lg:grid-cols-12 gap-6 min-h-screen">
        {/* Left column — chat */}
        <div className={`${webcamOn ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col`}>
          {/* Session header */}
          <div className="py-6 flex items-end justify-between border-b border-[#f2ece0]/[0.08] flex-wrap gap-4" data-testid="interview-header">
            <div>
              <div className="overline-gold mb-2">Session — Live</div>
              <div className="font-display text-3xl md:text-4xl tracking-tight">{interview.role_title}</div>
              <div className="overline mt-3">
                {interview.interview_type} · {interview.difficulty} · Question {Math.min(qCount, interview.num_questions)} / {interview.num_questions}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Voice mode toggle */}
              <button
                onClick={() => setVoiceMode((v) => !v)}
                className={`inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.28em] transition-all ${
                  voiceMode ? "border-[#c68b73] bg-[#c68b73] text-[#0c0a09]" : "border-[#f2ece0]/15 text-[#f2ece0] hover:border-[#c68b73]"
                }`}
                data-testid="voice-mode-toggle"
                title="Voice mode"
              >
                <Waves size={11} /> Voice
              </button>
              {/* TTS toggle */}
              <button
                onClick={() => setTtsOn((v) => !v)}
                className={`inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.28em] transition-all ${
                  ttsOn ? "border-[#c68b73] text-[#c68b73]" : "border-[#f2ece0]/15 text-[#a8a094]"
                }`}
                data-testid="tts-toggle"
                title="AI voice"
              >
                {ttsOn ? <Volume2 size={11} /> : <VolumeX size={11} />}
                {ttsOn ? "TTS on" : "TTS off"}
              </button>
              {/* Webcam toggle */}
              <button
                onClick={() => setWebcamOn((v) => !v)}
                className={`inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.28em] transition-all ${
                  webcamOn ? "border-[#c68b73] bg-[#c68b73] text-[#0c0a09]" : "border-[#f2ece0]/15 text-[#f2ece0] hover:border-[#c68b73]"
                }`}
                data-testid="webcam-toggle"
                title="Webcam"
              >
                <Camera size={11} /> Camera
              </button>
              <button
                onClick={finish}
                disabled={finishing}
                className="inline-flex items-center gap-2 border border-[#f2ece0]/15 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-[#f2ece0] hover:border-[#c68b73] hover:text-[#c68b73] transition-all disabled:opacity-60"
                data-testid="finish-interview-btn"
              >
                {finishing ? <Loader2 size={11} className="animate-spin" /> : <Flag size={11} />} Conclude
              </button>
            </div>
          </div>

          {/* Progress hairline */}
          <div className="h-px bg-[#f2ece0]/[0.06] relative overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-[#c68b73]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (qCount / interview.num_questions) * 100)}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto py-10 space-y-8" data-testid="messages-list">
            {interview.messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`msg-${i}`}
              >
                {m.role === "assistant" ? (
                  <div className="max-w-[85%] pr-8 border-l border-[#c68b73]/40 pl-6 py-1 group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="overline-gold">
                        {m.counsel_name ? `${m.counsel_name}${m.counsel_role ? ` · ${m.counsel_role}` : ""}` : "The Counsel"}
                      </div>
                      <button
                        onClick={() => playAudio(m.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity overline-gold text-[9px] hover:text-[#f2ece0]"
                        data-testid={`replay-${i}`}
                        title="Replay voice"
                      >
                        <Volume2 size={11} className="inline" /> Replay
                      </button>
                    </div>
                    <div className="font-display text-xl md:text-2xl leading-[1.4] text-[#f2ece0] whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[80%] bg-[#f2ece0] text-[#0c0a09] px-6 py-5 relative">
                    <div className="text-[9px] uppercase tracking-[0.32em] text-[#0c0a09]/50 mb-2">You</div>
                    <div className={`text-[15px] leading-relaxed whitespace-pre-wrap ${m.pending ? "italic opacity-60" : ""}`}>{m.content}</div>
                  </div>
                )}
              </motion.div>
            ))}
            {streamingText && (
              <div className="flex justify-start" data-testid="streaming-message">
                <div className="max-w-[85%] pr-8 border-l border-[#c68b73]/40 pl-6 py-1">
                  <div className="overline-gold mb-3">The Counsel</div>
                  <div className="font-display text-xl md:text-2xl leading-[1.4] text-[#f2ece0] whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-2 h-5 bg-[#c68b73] ml-1 align-middle animate-pulse" />
                  </div>
                </div>
              </div>
            )}
            {sending && !streamingText && (
              <div className="flex justify-start" data-testid="typing-indicator">
                <div className="border-l border-[#c68b73]/40 pl-6 py-1">
                  <div className="overline-gold mb-3">The Counsel</div>
                  <div className="flex items-center gap-2 text-sm text-[#a8a094]">
                    <span className="w-1.5 h-1.5 bg-[#c68b73] rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-[#c68b73] rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="w-1.5 h-1.5 bg-[#c68b73] rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                    <span className="italic">composing</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="sticky bottom-0 bg-gradient-to-t from-[#0c0a09] via-[#0c0a09] to-transparent pt-8 pb-2">
            <AnimatePresence mode="wait">
              {voiceMode ? (
                <motion.div
                  key="voice"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="border border-[#f2ece0]/[0.1] bg-[#141110]/60 backdrop-blur-xl p-6 flex flex-col items-center gap-4"
                  data-testid="voice-composer"
                >
                  <div className="overline-gold">Push · Answer · Release</div>
                  <VoiceRecorder onCommit={submitVoice} disabled={sending} />
                  <button onClick={() => setVoiceMode(false)} className="overline hover:text-[#c68b73] inline-flex items-center gap-2" data-testid="voice-back-btn">
                    <Keyboard size={11} /> Prefer keyboard
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="keyboard"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="border border-[#f2ece0]/[0.1] bg-[#141110]/60 backdrop-blur-xl flex items-end"
                  data-testid="composer"
                >
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (text.trim()) { const c = text.trim(); setText(""); sendStream(c); }
                      }
                    }}
                    placeholder="Your answer — Shift+Enter for newline"
                    rows={2}
                    className="flex-1 bg-transparent px-5 py-4 text-[#f2ece0] placeholder-[#6b6459] focus:outline-none resize-none text-[15px]"
                    data-testid="answer-input"
                  />
                  <button
                    onClick={() => { if (text.trim()) { const c = text.trim(); setText(""); sendStream(c); } }}
                    disabled={sending || !text.trim()}
                    className="shrink-0 inline-flex items-center gap-2 bg-[#c68b73] text-[#0c0a09] px-6 py-4 text-[10px] uppercase tracking-[0.32em] font-medium hover:bg-[#f2ece0] transition-all duration-300 disabled:opacity-40 m-2"
                    data-testid="send-btn"
                  >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column — webcam */}
        {webcamOn && (
          <div className="lg:col-span-4 pt-6" data-testid="webcam-column">
            <div className="overline-gold mb-3">Camera feed</div>
            <WebcamPanel active={webcamOn} onStop={handleWebcamStop} />
            <p className="mt-4 text-[11px] text-[#a8a094] leading-relaxed">
              Your camera runs locally. On conclude, an anonymised recording + engagement summary is saved to your private Salon archive.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
