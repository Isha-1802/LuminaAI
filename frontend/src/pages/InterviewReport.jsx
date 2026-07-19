import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, API, getToken } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, ArrowUpRight, Loader2, Download, Play, Volume2, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import InterviewHeatmap from "@/components/InterviewHeatmap";
import SpeechAnalyticsPanel from "@/components/SpeechAnalyticsPanel";
import AmbientBackground from "@/components/AmbientBackground";

const REPORT_BG = "https://images.unsplash.com/photo-1710438399422-2fca27686bcd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBnbGFzcyUyMHRleHR1cmV8ZW58MHx8fHwxNzgzMTg0OTI4fDA&ixlib=rb-4.1.0&q=85";

const scoreTone = (s) => (s >= 80 ? "text-[#c68b73]" : s >= 60 ? "text-[#f2ece0]" : s >= 40 ? "text-[#e2b48c]" : "text-[#8a5052]");
const scoreBar = (s) =>
  s >= 80
    ? "bg-[#c68b73]"
    : s >= 60
    ? "bg-[#f2ece0]"
    : s >= 40
    ? "bg-[#e2b48c]"
    : "bg-[#8a5052]";

export default function InterviewReport() {
  const { id } = useParams();
  const nav = useNavigate();
  const [interview, setInterview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const audioRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/interviews/${id}`);
      setInterview(data);
      // Fetch recording as blob (auth headers needed)
      if (data.recording) {
        try {
          const resp = await api.get(`/interviews/${id}/recording`, { responseType: "blob" });
          setVideoUrl(URL.createObjectURL(resp.data));
        } catch {}
      }
    } catch {
      nav("/dashboard");
    }
  };

  useEffect(() => {
    load();
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const regenerate = async () => {
    setBusy(true);
    try {
      await api.post(`/interviews/${id}/finish`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const token = getToken();
      const resp = await fetch(`${API}/interviews/${id}/report/pdf`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error("PDF failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lumina-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      // silent
    } finally {
      setPdfBusy(false);
    }
  };

  const speakSummary = async () => {
    if (!interview?.feedback?.summary) return;
    try {
      const { data } = await api.post("/tts", { text: interview.feedback.summary, voice: "sage" }, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
      }
    } catch {}
  };

  const [shareToken, setShareToken] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setShareToken(interview?.share_token || null); }, [interview]);

  const createShare = async () => {
    try {
      const { data } = await api.post(`/interviews/${id}/share`);
      setShareToken(data.share_token);
      const url = `${window.location.origin}/share/${data.share_token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link copied");
    } catch {
      toast.error("Could not create share");
    }
  };
  const revokeShare = async () => {
    try {
      await api.delete(`/interviews/${id}/share`);
      setShareToken(null);
      toast.success("Share revoked");
    } catch {}
  };
  const copyShare = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!interview) {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0] flex items-center justify-center" data-testid="report-loading">
        <Loader2 size={22} className="animate-spin text-[#c68b73]" />
      </div>
    );
  }

  const fb = interview.feedback || {};
  const scores = fb.scores || {};
  const overall = fb.overall_score ?? 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]" data-testid="report-page">
      <Navbar />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.12] bg-drift" style={{ backgroundImage: `url(${REPORT_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a09]/75 via-[#0c0a09]/90 to-[#0c0a09]" />
      </div>
      <AmbientBackground />
      <div className="pt-[112px] max-w-[1200px] mx-auto px-6 md:px-12 pb-24 relative z-10">
        {/* Cover */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="border-b border-[#f2ece0]/[0.08] pb-10 mb-16">
          <div className="flex items-center justify-between mb-6">
            <Link to="/dashboard" className="inline-flex items-center gap-2 overline hover:text-[#c68b73] transition-colors" data-testid="back-link">
              <ArrowLeft size={12} /> Salon
            </Link>
            <div className="overline-gold">§ The Verdict</div>
          </div>

          <h1 className="font-display text-[52px] md:text-[80px] leading-[0.94] tracking-[-0.03em]" data-testid="report-title">
            {interview.role_title}
          </h1>
          <div className="overline mt-6">
            {interview.interview_type} · {interview.difficulty} · {new Date(interview.completed_at || interview.created_at).toLocaleString()}
          </div>
        </motion.div>

        {/* Overall — editorial masthead */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="grid lg:grid-cols-12 gap-8 items-end mb-20"
          data-testid="overall-panel"
        >
          <div className="lg:col-span-5">
            <div className="overline-gold mb-4">Overall composition</div>
            <div className={`font-display text-[180px] md:text-[240px] leading-[0.85] tracking-[-0.05em] ${scoreTone(overall)}`} data-testid="overall-score">
              {overall}
            </div>
            <div className="overline mt-4">out of 100</div>
          </div>
          <div className="lg:col-span-7 space-y-6">
            {Object.entries(scores).map(([k, v]) => (
              <div key={k} data-testid={`score-${k}`}>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl tracking-tight capitalize">{k.replace("_", " ")}</span>
                  <span className={`font-display text-3xl ${scoreTone(v)}`}>{v}</span>
                </div>
                <div className="mt-3 h-px bg-[#f2ece0]/[0.08] relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${v}%` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute inset-y-0 left-0 ${scoreBar(v)}`}
                    style={{ height: "1px" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="border-y border-[#f2ece0]/[0.08] py-16 my-16"
          data-testid="report-summary-panel"
        >
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-3">
              <div className="overline-gold">Editor's Letter</div>
              <div className="font-display italic text-6xl text-[#c68b73]/60 mt-4">"</div>
            </div>
            <p className="lg:col-span-9 font-display text-2xl md:text-3xl leading-[1.4] tracking-[-0.01em] text-[#f2ece0]" data-testid="report-summary">
              {fb.summary || "Feedback will appear here once the rehearsal concludes."}
            </p>
          </div>
        </motion.div>

        {/* Strengths + Improvements */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} data-testid="strengths-panel">
            <div className="overline-gold mb-6">§ Strengths</div>
            <ul className="space-y-6">
              {(fb.strengths || []).map((s, i) => (
                <li key={i} className="flex gap-6 pb-6 border-b border-[#f2ece0]/[0.06] last:border-b-0" data-testid={`strength-${i}`}>
                  <span className="font-display italic text-[#c68b73] text-3xl leading-none">0{i + 1}</span>
                  <span className="text-[#f2ece0] leading-relaxed pt-1">{s}</span>
                </li>
              ))}
              {(!fb.strengths || fb.strengths.length === 0) && <li className="text-sm text-[#6b6459]">—</li>}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }} data-testid="improvements-panel">
            <div className="overline-gold mb-6">§ Refinements</div>
            <ul className="space-y-6">
              {(fb.improvements || []).map((s, i) => (
                <li key={i} className="flex gap-6 pb-6 border-b border-[#f2ece0]/[0.06] last:border-b-0" data-testid={`improvement-${i}`}>
                  <span className="font-display italic text-[#c68b73] text-3xl leading-none">0{i + 1}</span>
                  <span className="text-[#f2ece0] leading-relaxed pt-1">{s}</span>
                </li>
              ))}
              {(!fb.improvements || fb.improvements.length === 0) && <li className="text-sm text-[#6b6459]">—</li>}
            </ul>
          </motion.div>
        </div>

        {/* Heatmap */}
        {fb.heatmap && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.36 }}
            className="border-t border-[#f2ece0]/[0.08] pt-16 mb-16"
            data-testid="heatmap-panel"
          >
            <div className="overline-gold mb-8">§ The Heatmap</div>
            <InterviewHeatmap data={fb.heatmap} />
          </motion.div>
        )}

        {/* Speech & composure analytics */}
        {interview.speech_analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.38 }}
            className="border-t border-[#f2ece0]/[0.08] pt-16 mb-16"
            data-testid="speech-analytics-section"
          >
            <div className="overline-gold mb-8">§ Speech &amp; Composure</div>
            <SpeechAnalyticsPanel data={interview.speech_analytics} />
          </motion.div>
        )}

        {/* Next moves */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="border-t border-[#f2ece0]/[0.08] pt-16 mb-16"
          data-testid="next-steps-panel"
        >
          <div className="overline-gold mb-8">§ Next moves</div>
          <div className="grid md:grid-cols-3 gap-0 border border-[#f2ece0]/[0.08]">
            {(fb.next_steps || []).map((s, i) => (
              <div
                key={i}
                className={`p-8 relative ${i > 0 ? "md:border-l border-[#f2ece0]/[0.08]" : ""} ${i > 0 ? "border-t md:border-t-0 border-[#f2ece0]/[0.08]" : ""}`}
                data-testid={`next-step-${i}`}
              >
                <div className="font-display italic text-[#c68b73] text-5xl leading-none mb-6">0{i + 1}</div>
                <p className="text-[#f2ece0] leading-relaxed text-sm">{s}</p>
              </div>
            ))}
            {(!fb.next_steps || fb.next_steps.length === 0) && (
              <div className="p-8 text-sm text-[#6b6459] col-span-3">No recommendations available.</div>
            )}
          </div>
        </motion.div>

        {/* Recording panel */}
        {interview.recording && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.42 }}
            className="border-t border-[#f2ece0]/[0.08] pt-16 mb-16"
            data-testid="recording-panel"
          >
            <div className="overline-gold mb-8">§ The Silhouette · Camera</div>
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7">
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full aspect-video bg-[#0c0a09] border border-[#f2ece0]/[0.08]"
                    data-testid="recording-video"
                  />
                ) : (
                  <div className="aspect-video bg-[#0c0a09] border border-[#f2ece0]/[0.08] flex items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-[#c68b73]" />
                  </div>
                )}
              </div>
              <div className="lg:col-span-5 space-y-6">
                {[
                  { l: "Engagement", v: interview.recording.engagement_score, s: "score" },
                  { l: "Presence", v: interview.recording.presence_pct, s: "%" },
                  { l: "Speaking", v: interview.recording.speaking_pct, s: "%" },
                ].map((m) => (
                  <div key={m.l}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-2xl tracking-tight">{m.l}</span>
                      <span className={`font-display text-3xl ${scoreTone(m.v)}`}>{Math.round(m.v)}<span className="text-xs text-[#6b6459] ml-1">{m.s}</span></span>
                    </div>
                    <div className="mt-3 h-px bg-[#f2ece0]/[0.08] relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(100, m.v)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className={`absolute inset-y-0 left-0 ${scoreBar(m.v)}`}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-[#a8a094] leading-relaxed pt-2">
                  Engagement is derived on-device from face-presence luminance and mic activity — no third-party face recognition.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="border-t border-[#f2ece0]/[0.08] pt-16 flex flex-wrap gap-4 items-center">
          <Link
            to="/interview/new"
            className="group inline-flex items-center gap-3 border border-[#c68b73] text-[#f2ece0] px-8 py-4 text-[11px] uppercase tracking-[0.32em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all duration-500"
            data-testid="another-interview-btn"
          >
            Compose another rehearsal
            <ArrowUpRight size={14} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <button
            onClick={downloadPdf}
            disabled={pdfBusy}
            className="inline-flex items-center gap-2 border border-[#f2ece0]/15 text-[#f2ece0] px-6 py-4 text-[11px] uppercase tracking-[0.32em] hover:border-[#c68b73] hover:text-[#c68b73] transition-all duration-500 disabled:opacity-60"
            data-testid="download-pdf-btn"
          >
            {pdfBusy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Download PDF
          </button>
          {shareToken ? (
            <div className="inline-flex items-center gap-2" data-testid="share-active">
              <button onClick={copyShare} className="inline-flex items-center gap-2 border border-[#c68b73] text-[#c68b73] px-4 py-4 text-[11px] uppercase tracking-[0.32em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all" data-testid="copy-share-btn">
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy link"}
              </button>
              <button onClick={revokeShare} className="text-[10px] uppercase tracking-[0.28em] text-[#8a5052] hover:text-[#f2ece0] px-2" data-testid="revoke-share-btn">Revoke</button>
            </div>
          ) : (
            <button onClick={createShare} className="inline-flex items-center gap-2 border border-[#f2ece0]/15 text-[#f2ece0] px-6 py-4 text-[11px] uppercase tracking-[0.32em] hover:border-[#c68b73] hover:text-[#c68b73] transition-all" data-testid="share-btn">
              <Share2 size={12} /> Share to interviewer
            </button>
          )}
          <button
            onClick={speakSummary}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-[#a8a094] hover:text-[#c68b73] transition-colors"
            data-testid="speak-summary-btn"
          >
            <Volume2 size={12} /> Hear the letter
          </button>
          <button
            onClick={regenerate}
            disabled={busy}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-[#a8a094] hover:text-[#c68b73] transition-colors disabled:opacity-60"
            data-testid="regenerate-btn"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Rewrite the verdict
          </button>
          <div className="ml-auto overline">Vol I · Rehearsal Nº {String(interview.interview_id).slice(-4).toUpperCase()}</div>
        </div>
        <audio ref={audioRef} className="hidden" />
      </div>
    </motion.div>
  );
}
