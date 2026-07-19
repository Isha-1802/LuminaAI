import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import InterviewHeatmap from "@/components/InterviewHeatmap";
import ProgressAnalytics from "@/components/ProgressAnalytics";
import PracticeCalendar from "@/components/PracticeCalendar";
import CountUp from "@/components/CountUp";
import ResumeVerdict from "@/components/ResumeVerdict";
import DailyQuestion from "@/components/DailyQuestion";
import Ripple from "@/components/Ripple";
import MagneticButton from "@/components/MagneticButton";
import { Upload, FileText, ArrowUpRight, Loader2, Play, ChevronRight, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";

const scoreTone = (s) => (s >= 80 ? "text-[#c68b73]" : s >= 60 ? "text-[#f2ece0]" : s >= 40 ? "text-[#e2b48c]" : "text-[#8a5052]");
const fmt = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const DASHBOARD_BG = "https://images.unsplash.com/photo-1510519138101-570d1dca3d66?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHxkYXJrJTIwY2luZW1hdGljJTIwb2ZmaWNlJTIwbGlnaHRpbmd8ZW58MHx8fHwxNzgzMTg0OTI3fDA&ixlib=rb-4.1.0&q=85";

const GLASS = "rounded-2xl bg-[#f2ece0]/[0.05] backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.5)]";
const GLASS_HOVER = "hover:bg-[#f2ece0]/[0.08] hover:border-[#c68b73]/30 transition-all duration-500";

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activity, setActivity] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, a, act, r, iv, b] = await Promise.all([
        api.get("/stats/summary"),
        api.get("/stats/analytics"),
        api.get("/stats/activity"),
        api.get("/resumes"),
        api.get("/interviews"),
        api.get("/bookings/"),
      ]);
      setStats(s.data);
      setAnalytics(a.data);
      setActivity(act.data);
      setResumes(r.data);
      setInterviews(iv.data);
      setBookings(b.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "interviewer") {
      nav("/console", { replace: true });
    } else {
      refresh();
    }
  }, [refresh, user, nav]);

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

  const growthProfile = useMemo(() => {
    const withHeatmap = interviews.filter((iv) => iv.feedback?.heatmap);
    if (withHeatmap.length === 0) return null;
    const axes = ["communication", "problem_solving", "technical_depth", "confidence", "leadership", "system_design"];
    const avg = {};
    axes.forEach((k) => {
      const vals = withHeatmap.map((iv) => iv.feedback.heatmap[k]).filter((v) => typeof v === "number");
      avg[k] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    });
    return { avg, count: withHeatmap.length };
  }, [interviews]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]" data-testid="dashboard-page">
      <Navbar />
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.20] bg-drift" style={{ backgroundImage: `url(${DASHBOARD_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a09]/60 via-[#0c0a09]/90 to-[#0c0a09]" />
      </div>
      <AmbientBackground />

      <div className="pt-[112px] max-w-[1400px] mx-auto px-6 md:px-12 pb-24 relative z-10">
        {/* Editorial header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="border-b border-[#f2ece0]/[0.08] pb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="overline-gold">§ Dashboard — Private Record</div>
            <div className="overline">Volume I · {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</div>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-8">
            <h1 className="font-display text-[52px] md:text-[72px] leading-[0.94] tracking-[-0.03em]" data-testid="dashboard-greeting">
              Welcome, <span className="font-display-italic text-shimmer">{first}</span>.
            </h1>
            {user?.role === "interviewer" ? (
              <Link
                to="/console"
                className="group inline-flex items-center gap-2 border border-[#c68b73] text-[#f2ece0] px-8 py-4 text-[11px] uppercase tracking-[0.32em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all duration-500"
                data-testid="new-interview-btn"
              >
                Open the Console
                <ArrowUpRight size={14} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <MagneticButton>
                <Ripple className="block">
                  <Link
                    to="/practice"
                    className="group inline-flex items-center gap-2 rounded-full border border-[#c68b73] text-[#f2ece0] px-6 py-4 text-[11px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all duration-500"
                    data-testid="rehearsal-room-btn"
                  >
                    <Sparkles size={14} /> Enter the Rehearsal Room
                  </Link>
                </Ripple>
              </MagneticButton>
            )}
          </div>
        </motion.div>

        {/* Daily question — the streak keeper */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.04 }}
          className={`mt-14 p-10 ${GLASS} border-[#c68b73]/25`}
        >
          <DailyQuestion onAnswered={refresh} />
        </motion.div>

        {/* Ledger stats */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-grid">
          {[
            { label: "Rehearsals", value: stats?.total_interviews ?? 0 },
            { label: "Completed", value: stats?.completed ?? 0 },
            { label: "Average", value: stats?.average_score ?? 0, accent: true, suffix: "/100" },
            { label: "Best", value: stats?.best_score ?? 0, accent: true, suffix: "/100" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={`px-6 py-8 md:px-8 md:py-10 relative group ${GLASS} ${GLASS_HOVER}`}
              data-testid={`stat-${s.label.toLowerCase()}`}
            >
              <div className="overline mb-6">{s.label}</div>
              <div className="flex items-baseline gap-1">
                <CountUp
                  value={Number(s.value) || 0}
                  className={`font-display text-4xl md:text-6xl tracking-[-0.03em] ${s.accent ? scoreTone(Number(s.value)) : "text-[#f2ece0]"}`}
                />
                {s.suffix && <span className="text-[#6b6459] text-xs">{s.suffix}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Practice calendar — daily rhythm + streaks */}
        {activity && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06 }}
            className={`mt-14 p-10 ${GLASS}`}
            data-testid="practice-calendar-panel"
          >
            <PracticeCalendar data={activity} />
          </motion.div>
        )}

        {/* Growth profile — aggregate heatmap across rehearsals */}
        {growthProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className={`mt-14 p-10 ${GLASS}`}
            data-testid="growth-profile-panel"
          >
            <div className="flex items-center justify-between mb-8 flex-wrap gap-2">
              <div>
                <div className="overline-gold mb-2">§ Growth Profile</div>
                <h3 className="font-display text-3xl tracking-tight">Averaged across {growthProfile.count} rehearsal{growthProfile.count === 1 ? "" : "s"}</h3>
              </div>
            </div>
            <InterviewHeatmap data={growthProfile.avg} />
          </motion.div>
        )}

        {/* Progress analytics — trajectory, weak areas, benchmarks */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`mt-14 p-10 ${GLASS}`}
            data-testid="progress-analytics-panel"
          >
            <ProgressAnalytics data={analytics} />
          </motion.div>
        )}

        {/* Upcoming Bookings Section */}
        {bookings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }} className={`mt-14 p-10 ${GLASS}`}>
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="text-[#c68b73]" />
              <h3 className="font-display text-3xl tracking-tight">Upcoming Sessions</h3>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.map(b => (
                <div key={b.booking_id} className={`p-6 rounded-xl bg-[#0c0a09]/40 backdrop-blur-md border border-[#c68b73]/20 ${GLASS_HOVER}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-medium text-[#f2ece0]">
                        {user.role === 'interviewer' ? b.candidate_name : b.interviewer_name}
                      </div>
                      <div className="text-sm text-[#a8a094]">
                        {user.role === 'interviewer' ? 'Candidate' : 'Interviewer'}
                      </div>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider bg-[#c68b73]/10 text-[#c68b73] px-2 py-1">
                      {b.status}
                    </div>
                  </div>
                  
                  <div className="text-sm text-[#a8a094] mb-6">
                    {fmt(b.start_time)}
                  </div>
                  
                  <Link
                    to={`/booking/${b.booking_id}`}
                    className="block w-full text-center rounded-lg border border-[#c68b73] py-3 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all"
                  >
                    View Details & Join
                  </Link>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-12 gap-8 mt-14">
          {/* Dossier — résumés */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`lg:col-span-4 p-10 ${GLASS}`}
            data-testid="resumes-panel"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="overline-gold mb-2">Resumes — 01</div>
                <h3 className="font-display text-3xl tracking-tight">Your Resumes</h3>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full border border-[#f2ece0]/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.28em] text-[#f2ece0] hover:border-[#c68b73] hover:text-[#c68b73] cursor-pointer transition-all" data-testid="upload-resume-btn">
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                File
                <input type="file" accept=".pdf,.docx,.txt" hidden onChange={onUpload} data-testid="resume-file-input" />
              </label>
            </div>

            {resumes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#f2ece0]/[0.15] py-16 text-center">
                <FileText size={18} className="text-[#c68b73] mx-auto mb-4" />
                <p className="text-sm text-[#a8a094] max-w-[240px] mx-auto leading-relaxed">
                  File a PDF, DOCX or TXT to unlock résumé-aware interviews.
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
                    <span className="font-display italic text-[#c68b73] text-2xl w-8">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[#f2ece0] truncate">{r.original_filename || "Résumé"}</div>
                      <div className="overline mt-1">{fmt(r.created_at)}</div>
                    </div>
                    <ResumeVerdict resume={r} />
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
            className={`lg:col-span-8 p-10 ${GLASS}`}
            data-testid="history-panel"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="overline-gold mb-2">Interview History</div>
                <h3 className="font-display text-3xl tracking-tight">Every interview, remembered</h3>
              </div>
              <Link to="/interview/new" className="overline hover:text-[#c68b73] transition-colors inline-flex items-center gap-2" data-testid="history-new-link">
                New Interview <ArrowUpRight size={12} />
              </Link>
            </div>

            {interviews.length === 0 ? (
              <div className="py-20 text-center">
                <div className="font-display italic text-6xl text-[#c68b73]/50 mb-4">"</div>
                <p className="text-[#a8a094] max-w-md mx-auto leading-relaxed">
                  Your history is quiet. The first interview you complete will be stored here — with scores, notes, and the exact transcript.
                </p>
                <Link
                  to="/interview/new"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#c68b73] px-6 py-3 text-[10px] uppercase tracking-[0.32em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all duration-500"
                  data-testid="empty-start-btn"
                >
                  <Play size={11} /> Start Interview
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#f2ece0]/[0.06]">
                {interviews.map((iv, i) => (
                  <button
                    key={iv.interview_id}
                    onClick={() => nav(iv.status === "completed" ? `/interview/${iv.interview_id}/report` : `/interview/${iv.interview_id}`)}
                    className="group w-full py-6 px-4 -mx-4 rounded-xl grid grid-cols-12 gap-4 items-center text-left hover:bg-[#f2ece0]/[0.05] transition-colors"
                    data-testid={`interview-row-${iv.interview_id}`}
                  >
                    <div className="col-span-1">
                      <span className="font-display italic text-[#c68b73] text-2xl">{String(interviews.length - i).padStart(2, "0")}</span>
                    </div>
                    <div className="col-span-6 min-w-0">
                      <div className="font-display text-2xl tracking-tight text-[#f2ece0] group-hover:text-[#c68b73] transition-colors truncate">
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
                        iv.status === "completed" ? "border-[#c68b73]/40 text-[#c68b73]" : "border-[#f2ece0]/20 text-[#a8a094]"
                      }`}>
                        {iv.status === "completed" ? "Concluded" : "In session"}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <ChevronRight size={16} className="text-[#6b6459] group-hover:text-[#c68b73] group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
