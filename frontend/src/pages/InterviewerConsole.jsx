import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import MonetizationCard from "@/components/MonetizationCard";
import CountUp from "@/components/CountUp";
import { AuroraField } from "@/components/Parallax";
import { ArrowUpRight, Users, CheckCircle, Calendar, Star, Loader2, Wallet, TrendingUp, Circle } from "lucide-react";
import { toast } from "sonner";

const GLASS = "rounded-2xl bg-[#f2ece0]/[0.05] backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.5)]";
const fmt = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Stars({ value, size = 12 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < Math.round(value) ? "text-[#c68b73] fill-[#c68b73]" : "text-[#6b6459]"} />
      ))}
    </span>
  );
}

export default function InterviewerConsole() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (user && user.role !== "interviewer") nav("/dashboard", { replace: true });
  }, [user, nav]);

  const load = useCallback(async () => {
    try {
      const [b, s, p] = await Promise.all([
        api.get("/bookings/"),
        api.get("/stats/interviewer"),
        api.get("/profiles/me"),
      ]);
      setBookings(b.data);
      setStats(s.data);
      setMyProfile(p.data);
    } catch {
      toast.error("Failed to load your console");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completed = bookings.filter((b) => b.status === "completed");
  const upcoming = bookings.filter((b) => b.status === "scheduled");
  const first = user?.name?.split(" ")[0] || "counsel";

  const tiles = [
    { label: "Completed", value: stats?.completed ?? 0 },
    { label: "Upcoming", value: stats?.upcoming ?? 0 },
    { label: "Avg Rating", value: stats?.avg_rating ?? 0, accent: true, suffix: "/5" },
    { label: "Earnings", value: stats?.estimated_earnings_inr ?? 0, accent: true, prefix: "₹" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen text-[#f2ece0]" data-testid="console-page">
      <Navbar />
      <AuroraField variant="ember" />
      <div className="pt-[112px] max-w-[1300px] mx-auto px-6 md:px-12 pb-24 relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="border-b border-[#f2ece0]/[0.08] pb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="overline-gold">§ Interviewer Console</div>
            <div className="flex items-center gap-2 overline">
              <Circle size={8} className={stats?.is_available ? "fill-[#7bb661] text-[#7bb661]" : "fill-[#8a5052] text-[#8a5052]"} />
              {stats?.is_available ? "Available for bookings" : "Not available"}
            </div>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-8">
            <h1 className="font-display text-[52px] md:text-[72px] leading-[0.94] tracking-[-0.03em]" data-testid="console-title">
              Welcome, <span className="font-display-italic text-shimmer">{first}</span>.
            </h1>
            <Link
              to="/profile"
              className="group inline-flex items-center gap-2 border border-[#c68b73] text-[#f2ece0] px-6 py-4 text-[11px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all duration-500"
            >
              Edit availability & profile <ArrowUpRight size={14} />
            </Link>
          </div>
        </motion.div>

        {busy ? (
          <div className="py-32 flex justify-center"><Loader2 size={24} className="animate-spin text-[#c68b73]" /></div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="console-stats">
              {tiles.map((t, i) => (
                <motion.div key={t.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.06 }} className={`px-6 py-8 md:px-8 md:py-10 ${GLASS}`}>
                  <div className="overline mb-6">{t.label}</div>
                  <div className="flex items-baseline gap-1">
                    {t.prefix && <span className="text-[#6b6459] text-lg">{t.prefix}</span>}
                    <CountUp value={Number(t.value) || 0} className={`font-display text-4xl md:text-5xl tracking-[-0.03em] ${t.accent ? "text-[#c68b73]" : "text-[#f2ece0]"}`} />
                    {t.suffix && <span className="text-[#6b6459] text-xs">{t.suffix}</span>}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-14 grid lg:grid-cols-12 gap-8">
              {/* Left — roster */}
              <div className="lg:col-span-8 space-y-10">
                {/* Upcoming */}
                {upcoming.length > 0 && (
                  <div className={`p-8 md:p-10 ${GLASS}`}>
                    <div className="flex items-center gap-3 mb-6">
                      <Calendar className="text-[#c68b73]" size={18} />
                      <h2 className="font-display text-3xl tracking-tight">Upcoming Sessions</h2>
                    </div>
                    <div className="divide-y divide-[#f2ece0]/[0.06]">
                      {upcoming.map((b) => (
                        <div key={b.booking_id} className="py-5 flex items-center justify-between gap-4">
                          <div>
                            <div className="font-display text-2xl tracking-tight">{b.candidate_name}</div>
                            <div className="text-sm text-[#a8a094] mt-1">{fmt(b.start_time)}</div>
                          </div>
                          <Link to={`/booking/${b.booking_id}`} className="shrink-0 inline-flex items-center gap-2 border border-[#c68b73] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-[#c68b73] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all">
                            Open <ArrowUpRight size={12} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past candidates */}
                <div className={`p-8 md:p-10 ${GLASS}`}>
                  <div className="flex items-center gap-3 mb-6">
                    <Users className="text-[#f2ece0]" size={18} />
                    <h2 className="font-display text-3xl tracking-tight">Past Candidates</h2>
                  </div>
                  {completed.length === 0 ? (
                    <div className="border border-dashed border-[#f2ece0]/[0.15] rounded-xl py-16 text-center">
                      <div className="font-display italic text-5xl text-[#c68b73]/50 mb-3">"</div>
                      <p className="text-[#a8a094] max-w-md mx-auto leading-relaxed">
                        No completed interviews yet. Turn on availability in your profile so candidates can book you — finished sessions appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#f2ece0]/[0.06]">
                      {completed.map((b) => (
                        <div key={b.booking_id} className="py-5 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-display text-2xl tracking-tight">{b.candidate_name}</span>
                              <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.28em] text-[#c68b73] border border-[#c68b73]/40 px-2 py-0.5"><CheckCircle size={10} /> Done</span>
                            </div>
                            <div className="text-sm text-[#a8a094] mt-1.5">{fmt(b.updated_at || b.start_time)}</div>
                          </div>
                          <Link to={`/booking/${b.booking_id}`} className="shrink-0 inline-flex items-center gap-2 overline text-[#a8a094] hover:text-[#f2ece0] transition-colors">
                            View log <ArrowUpRight size={12} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right — earnings, tier, ratings, reviews */}
              <div className="lg:col-span-4 space-y-8">
                <MonetizationCard interviewer={myProfile} />

                {/* Next tier progress */}
                {stats?.next_tier && (
                  <div className={`p-7 ${GLASS}`}>
                    <div className="flex items-center gap-2 overline-gold mb-3"><TrendingUp size={12} /> Next Tier</div>
                    <div className="font-display text-2xl tracking-tight mb-2">{stats.next_tier.tier} · ₹{stats.next_tier.rate_inr}/interview</div>
                    <p className="text-sm text-[#a8a094] leading-relaxed">
                      {stats.next_tier.interviews_needed > 0
                        ? `${stats.next_tier.interviews_needed} more interview${stats.next_tier.interviews_needed === 1 ? "" : "s"} and a ${stats.next_tier.rating_needed}+ rating to unlock.`
                        : `Keep a ${stats.next_tier.rating_needed}+ rating to reach it.`}
                    </p>
                  </div>
                )}

                {/* Ratings */}
                <div className={`p-7 ${GLASS}`} data-testid="ratings-panel">
                  <div className="flex items-center gap-2 overline-gold mb-4"><Star size={12} /> Ratings</div>
                  <div className="flex items-baseline gap-3 mb-5">
                    <span className="font-display text-4xl text-[#c68b73]">{stats?.avg_rating || 0}</span>
                    <Stars value={stats?.avg_rating || 0} size={14} />
                    <span className="overline ml-auto">{stats?.review_count || 0} review{stats?.review_count === 1 ? "" : "s"}</span>
                  </div>
                  {(stats?.review_count || 0) > 0 ? (
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = stats.rating_breakdown?.[star] || 0;
                        const pct = stats.review_count ? (count / stats.review_count) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-3">
                            <span className="text-xs text-[#a8a094] w-3">{star}</span>
                            <Star size={10} className="text-[#6b6459]" />
                            <div className="flex-1 h-1.5 rounded-full bg-[#f2ece0]/[0.06] overflow-hidden">
                              <div className="h-full rounded-full bg-[#c68b73]" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-[#6b6459] w-4 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6b6459]">No reviews yet — your first candidate rating shows here.</p>
                  )}
                </div>

                {/* Recent reviews */}
                {(stats?.recent_reviews || []).length > 0 && (
                  <div className={`p-7 ${GLASS}`}>
                    <div className="overline-gold mb-4">§ Recent Reviews</div>
                    <div className="space-y-4">
                      {stats.recent_reviews.map((r, i) => (
                        <div key={i} className="pb-4 border-b border-[#f2ece0]/[0.06] last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-[#f2ece0]">{r.candidate_name || "Candidate"}</span>
                            <Stars value={r.rating} size={11} />
                          </div>
                          {r.comment && <p className="text-sm text-[#a8a094] leading-relaxed">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
