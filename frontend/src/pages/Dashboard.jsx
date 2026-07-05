import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Upload, FileText, ArrowUpRight, Loader2, Play, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const scoreTone = (s) => (s >= 80 ? "text-[#c9a96e]" : s >= 60 ? "text-[#f2ece0]" : s >= 40 ? "text-[#e2b48c]" : "text-[#8a5052]");
const fmt = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, r, iv] = await Promise.all([
        api.get("/stats/summary"),
        api.get("/resumes"),
        api.get("/interviews"),
      ]);
      setStats(s.data);
      setResumes(r.data);
      setInterviews(iv.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/resumes/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Résumé filed");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const first = user?.name?.split(" ")[0] || "friend";

  return (
    <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0]" data-testid="dashboard-page">
      <Navbar />
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-20 -right-40 w-[520px] h-[520px] rounded-full bg-[#c9a96e]/[0.05] blur-[130px]" />
      </div>

      <div className="pt-[112px] max-w-[1400px] mx-auto px-6 md:px-12 pb-24 relative">
        {/* Editorial header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="border-b border-[#f2ece0]/[0.08] pb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="overline-gold">§ Salon — Private Record</div>
            <div className="overline">Volume I · {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</div>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-8">
            <h1 className="font-display text-[52px] md:text-[72px] leading-[0.94] tracking-[-0.03em]" data-testid="dashboard-greeting">
              Welcome, <span className="font-display-italic text-shimmer">{first}</span>.
            </h1>
            <Link
              to={user?.role === "interviewer" ? "/console" : "/interview/new"}
              className="group inline-flex items-center gap-2 border border-[#c9a96e] text-[#f2ece0] px-8 py-4 text-[11px] uppercase tracking-[0.32em] hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all duration-500"
              data-testid="new-interview-btn"
            >
              {user?.role === "interviewer" ? "Open the Console" : "Compose a rehearsal"}
              <ArrowUpRight size={14} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {/* Ledger stats */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-0 border border-[#f2ece0]/[0.08]" data-testid="stats-grid">
          {[
            { label: "Rehearsals", value: stats?.total_interviews ?? 0 },
            { label: "Completed", value: stats?.completed ?? 0 },
            { label: "Average", value: stats?.average_score ?? 0, accent: true, suffix: "/100" },
            { label: "Best", value: stats?.best_score ?? 0, accent: true, suffix: "/100" },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`px-8 py-10 relative ${i > 0 ? "md:border-l border-[#f2ece0]/[0.08]" : ""} ${i % 2 === 1 ? "border-l border-[#f2ece0]/[0.08] md:border-l-0" : ""} ${i > 1 ? "border-t md:border-t-0 border-[#f2ece0]/[0.08]" : ""}`}
              data-testid={`stat-${s.label.toLowerCase()}`}
            >
              <div className="overline mb-6">{s.label}</div>
              <div className="flex items-baseline gap-1">
                <span className={`font-display text-5xl md:text-6xl tracking-[-0.03em] ${s.accent ? scoreTone(Number(s.value)) : "text-[#f2ece0]"}`}>
                  {s.value}
                </span>
                {s.suffix && <span className="text-[#6b6459] text-xs">{s.suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-8 mt-14">
          {/* Dossier — résumés */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-4 border border-[#f2ece0]/[0.08] p-10"
            data-testid="resumes-panel"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="overline-gold mb-2">Dossier — 01</div>
                <h3 className="font-display text-3xl tracking-tight">Your résumés</h3>
              </div>
              <label className="inline-flex items-center gap-2 border border-[#f2ece0]/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.28em] text-[#f2ece0] hover:border-[#c9a96e] hover:text-[#c9a96e] cursor-pointer transition-all" data-testid="upload-resume-btn">
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                File
                <input type="file" accept=".pdf,.docx,.txt" hidden onChange={onUpload} data-testid="resume-file-input" />
              </label>
            </div>

            {resumes.length === 0 ? (
              <div className="border border-dashed border-[#f2ece0]/[0.1] py-16 text-center">
                <FileText size={18} className="text-[#c9a96e] mx-auto mb-4" />
                <p className="text-sm text-[#a8a094] max-w-[240px] mx-auto leading-relaxed">
                  File a PDF, DOCX or TXT to unlock résumé-aware rehearsals.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {resumes.map((r, i) => (
                  <div
                    key={r.resume_id}
                    className={`flex items-center gap-4 py-4 ${i > 0 ? "border-t border-[#f2ece0]/[0.06]" : ""}`}
                    data-testid={`resume-${r.resume_id}`}
                  >
                    <span className="font-display italic text-[#c9a96e] text-2xl w-8">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[#f2ece0] truncate">{r.original_filename || "Résumé"}</div>
                      <div className="overline mt-1">{fmt(r.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Archive — interview history */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-8 border border-[#f2ece0]/[0.08] p-10"
            data-testid="history-panel"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="overline-gold mb-2">Archive — Rehearsals</div>
                <h3 className="font-display text-3xl tracking-tight">Every room, remembered</h3>
              </div>
              <Link to="/interview/new" className="overline hover:text-[#c9a96e] transition-colors inline-flex items-center gap-2" data-testid="history-new-link">
                Compose another <ArrowUpRight size={12} />
              </Link>
            </div>

            {interviews.length === 0 ? (
              <div className="py-20 text-center">
                <div className="font-display italic text-6xl text-[#c9a96e]/50 mb-4">"</div>
                <p className="text-[#a8a094] max-w-md mx-auto leading-relaxed">
                  Your archive is quiet. The first rehearsal you compose will be bound here — with scores, notes, and the room's exact silhouette.
                </p>
                <Link
                  to="/interview/new"
                  className="mt-8 inline-flex items-center gap-2 border border-[#c9a96e] px-6 py-3 text-[10px] uppercase tracking-[0.32em] hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all duration-500"
                  data-testid="empty-start-btn"
                >
                  <Play size={11} /> Compose the first
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#f2ece0]/[0.06]">
                {interviews.map((iv, i) => (
                  <button
                    key={iv.interview_id}
                    onClick={() => nav(iv.status === "completed" ? `/interview/${iv.interview_id}/report` : `/interview/${iv.interview_id}`)}
                    className="group w-full py-6 grid grid-cols-12 gap-4 items-center text-left hover:bg-[#f2ece0]/[0.015] transition-colors"
                    data-testid={`interview-row-${iv.interview_id}`}
                  >
                    <div className="col-span-1">
                      <span className="font-display italic text-[#c9a96e] text-2xl">{String(interviews.length - i).padStart(2, "0")}</span>
                    </div>
                    <div className="col-span-6 min-w-0">
                      <div className="font-display text-2xl tracking-tight text-[#f2ece0] group-hover:text-[#c9a96e] transition-colors truncate">
                        {iv.role_title}
                      </div>
                      <div className="overline mt-2">
                        {iv.interview_type} · {iv.difficulty} · {fmt(iv.created_at)}
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className={`font-display text-3xl tracking-tight ${iv.score != null ? scoreTone(iv.score) : "text-[#6b6459]"}`}>
                        {iv.score ?? "—"}
                      </div>
                      <div className="overline">Score</div>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <span className={`text-[9px] uppercase tracking-[0.32em] px-3 py-1.5 border ${
                        iv.status === "completed" ? "border-[#c9a96e]/40 text-[#c9a96e]" : "border-[#f2ece0]/20 text-[#a8a094]"
                      }`}>
                        {iv.status === "completed" ? "Concluded" : "In session"}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <ChevronRight size={16} className="text-[#6b6459] group-hover:text-[#c9a96e] group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
