import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import { ArrowLeft, Loader2, Check, X, Send } from "lucide-react";
import { toast } from "sonner";

const scoreTone = (s) => (s >= 80 ? "text-[#c68b73]" : s >= 60 ? "text-[#f2ece0]" : s >= 40 ? "text-[#e2b48c]" : "text-[#8a5052]");
const scoreBar = (s) => (s >= 80 ? "bg-[#c68b73]" : s >= 60 ? "bg-[#f2ece0]" : s >= 40 ? "bg-[#e2b48c]" : "bg-[#8a5052]");

export default function SharedReport() {
  const { token } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [verdict, setVerdict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // public endpoint — no auth required
        const { data } = await api.get(`/share/${token}`);
        setReport(data);
      } catch {
        toast.error("Share not found or revoked");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submitNote = async () => {
    if (!user) { toast.error("Sign in to add a note"); return; }
    if (user.role !== "interviewer") { toast.error("Only interviewer accounts can add verdicts"); return; }
    setSaving(true);
    try {
      await api.post(`/share/${token}/note`, { verdict, note });
      toast.success("Note filed");
      setNote(""); setVerdict(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#c68b73]" />
      </div>
    );
  }
  if (!report) {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0] flex items-center justify-center">
        <div className="text-center">
          <div className="font-display italic text-6xl text-[#c68b73]/50 mb-4">"</div>
          <p className="text-[#a8a094]">This share link has been revoked or never existed.</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 overline hover:text-[#c68b73]"><ArrowLeft size={12} /> Return</Link>
        </div>
      </div>
    );
  }

  const fb = report.feedback || {};
  const scores = fb.scores || {};
  const overall = fb.overall_score ?? 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]" data-testid="shared-report-page">
      <Navbar />
      <AmbientBackground variant="quiet" />
      <div className="pt-[112px] max-w-[1200px] mx-auto px-6 md:px-12 pb-24">
        <div className="border-b border-[#f2ece0]/[0.08] pb-10 mb-16">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="inline-flex items-center gap-2 overline hover:text-[#c68b73] transition-colors"><ArrowLeft size={12} /> Lumina</Link>
            <div className="overline-gold">§ Shared Dossier</div>
          </div>
          <h1 className="font-display text-[52px] md:text-[80px] leading-[0.94] tracking-[-0.03em]">
            {report.role_title}
          </h1>
          <div className="overline mt-6">
            {report.interview_type} · {report.difficulty}
            {report.atelier_id ? ` · ${report.atelier_id}` : ""} · Shared
          </div>
        </div>

        {/* Overall */}
        <div className="grid lg:grid-cols-12 gap-8 items-end mb-20">
          <div className="lg:col-span-5">
            <div className="overline-gold mb-4">Overall composition</div>
            <div className={`font-display text-[180px] md:text-[240px] leading-[0.85] tracking-[-0.05em] ${scoreTone(overall)}`} data-testid="shared-overall-score">
              {overall}
            </div>
            <div className="overline mt-4">out of 100</div>
          </div>
          <div className="lg:col-span-7 space-y-6">
            {Object.entries(scores).map(([k, v]) => (
              <div key={k}>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl tracking-tight capitalize">{k.replace("_", " ")}</span>
                  <span className={`font-display text-3xl ${scoreTone(v)}`}>{v}</span>
                </div>
                <div className="mt-3 h-px bg-[#f2ece0]/[0.08] relative overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 1.2 }} className={`absolute inset-y-0 left-0 ${scoreBar(v)}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {fb.summary && (
          <div className="border-y border-[#f2ece0]/[0.08] py-16 my-16">
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-3">
                <div className="overline-gold">Editor's Letter</div>
                <div className="font-display italic text-6xl text-[#c68b73]/60 mt-4">"</div>
              </div>
              <p className="lg:col-span-9 font-display text-2xl md:text-3xl leading-[1.4] tracking-[-0.01em]">
                {fb.summary}
              </p>
            </div>
          </div>
        )}

        {/* Strengths + refinements */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <div className="overline-gold mb-6">§ Strengths</div>
            <ul className="space-y-6">
              {(fb.strengths || []).map((s, i) => (
                <li key={i} className="flex gap-6 pb-6 border-b border-[#f2ece0]/[0.06] last:border-b-0">
                  <span className="font-display italic text-[#c68b73] text-3xl leading-none">0{i + 1}</span>
                  <span className="leading-relaxed pt-1">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="overline-gold mb-6">§ Refinements</div>
            <ul className="space-y-6">
              {(fb.improvements || []).map((s, i) => (
                <li key={i} className="flex gap-6 pb-6 border-b border-[#f2ece0]/[0.06] last:border-b-0">
                  <span className="font-display italic text-[#c68b73] text-3xl leading-none">0{i + 1}</span>
                  <span className="leading-relaxed pt-1">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Transcript */}
        <div className="border-t border-[#f2ece0]/[0.08] pt-16 mb-16">
          <div className="overline-gold mb-8">§ Transcript</div>
          <div className="space-y-8">
            {(report.messages || []).map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" ? (
                  <div className="max-w-[85%] border-l border-[#c68b73]/40 pl-6 py-1">
                    <div className="overline-gold mb-2">{m.counsel_name || "The Counsel"}{m.counsel_role ? ` · ${m.counsel_role}` : ""}</div>
                    <div className="font-display text-xl leading-snug whitespace-pre-wrap">{m.content}</div>
                  </div>
                ) : (
                  <div className="max-w-[80%] bg-[#f2ece0] text-[#0c0a09] px-5 py-4">
                    <div className="text-[9px] uppercase tracking-[0.32em] text-[#0c0a09]/50 mb-2">Candidate</div>
                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reviewer note */}
        {user?.role === "interviewer" && (
          <div className="border-t border-[#f2ece0]/[0.08] pt-16" data-testid="reviewer-note-panel">
            <div className="overline-gold mb-6">§ Your verdict (private)</div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {[
                { id: "hire", label: "Hire", icon: Check, cls: "border-[#c68b73] text-[#c68b73]" },
                { id: "borderline", label: "Borderline", icon: null, cls: "border-[#f2ece0]/25 text-[#f2ece0]" },
                { id: "pass", label: "Pass", icon: X, cls: "border-[#8a5052] text-[#8a5052]" },
              ].map((v) => (
                <button key={v.id} onClick={() => setVerdict(v.id)}
                  className={`inline-flex items-center gap-2 border px-5 py-2 text-[10px] uppercase tracking-[0.28em] transition-all ${
                    verdict === v.id ? "bg-[#f2ece0] text-[#0c0a09] border-[#f2ece0]" : v.cls
                  }`}
                  data-testid={`verdict-${v.id}`}
                >
                  {v.icon && <v.icon size={11} />} {v.label}
                </button>
              ))}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
              className="w-full bg-transparent border border-[#f2ece0]/[0.1] p-4 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
              placeholder="Your notes on the candidate…"
              data-testid="reviewer-note-input" />
            <div className="mt-4">
              <button onClick={submitNote} disabled={saving || (!note && !verdict)}
                className="inline-flex items-center gap-2 border border-[#c68b73] px-6 py-3 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all disabled:opacity-60"
                data-testid="submit-note-btn">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} File verdict
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
