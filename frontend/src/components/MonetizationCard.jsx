import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TrendingUp, Lock, CheckCircle, Star, Award } from "lucide-react";
import { motion } from "framer-motion";

const TIER_ORDER = ["Building", "Bronze", "Silver", "Gold", "Elite"];

const TIER_ICONS = {
  Building: "🔨",
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Elite: "💎",
};

export default function MonetizationCard({ interviewer }) {
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    api.get("/profiles/monetization-tiers")
      .then(r => setTiers(r.data))
      .catch(() => {});
  }, []);

  if (!tiers.length || !interviewer) return null;

  const interviewCount = interviewer.completed_interview_count || 0;
  const avgRating = interviewer.avg_rating || 0;
  const currentTierName = interviewer.monetization_tier || "Building";
  const currentTier = tiers.find(t => t.tier === currentTierName) || tiers[0];
  const currentTierIndex = TIER_ORDER.indexOf(currentTierName);
  const isElite = currentTierName === "Elite";

  // Next tier to unlock
  const nextTier = !isElite ? tiers[currentTierIndex + 1] : null;

  // Progress towards next tier (based on interviews)
  let progressPct = 100;
  if (nextTier) {
    const prevMin = currentTier.min_interviews;
    const nextMin = nextTier.min_interviews;
    progressPct = Math.min(100, Math.round(((interviewCount - prevMin) / (nextMin - prevMin)) * 100));
    if (progressPct < 0) progressPct = 0;
  }

  return (
    <div className="border border-[#f2ece0]/[0.08] bg-[#f2ece0]/[0.02] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#f2ece0]/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={18} className="text-[#c9a96e]" />
          <h3 className="font-display text-2xl tracking-tight">Monetization Status</h3>
        </div>
        <div
          className="text-[11px] uppercase tracking-wider px-3 py-1 border font-medium"
          style={{ borderColor: currentTier.color, color: currentTier.color }}
        >
          {TIER_ICONS[currentTierName]} {currentTierName}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Tier */}
        {currentTier.is_monetized ? (
          <div className="flex items-start gap-4 p-4 border border-[#c9a96e]/20 bg-[#c9a96e]/5">
            <CheckCircle className="text-[#c9a96e] shrink-0 mt-0.5" size={18} />
            <div>
              <div className="text-sm font-medium text-[#f2ece0]">Account Monetized</div>
              <div className="text-xs text-[#a8a094] mt-0.5">
                You earn <span className="text-[#c9a96e] font-bold">₹{currentTier.rate_inr.toLocaleString("en-IN")}</span> per completed interview session.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 p-4 border border-[#f2ece0]/[0.1] bg-[#f2ece0]/[0.03]">
            <Lock className="text-[#a8a094] shrink-0 mt-0.5" size={18} />
            <div>
              <div className="text-sm font-medium text-[#f2ece0]">Building Reputation</div>
              <div className="text-xs text-[#a8a094] mt-0.5">
                Your first {4 - Math.min(interviewCount, 4)} interviews are free. Complete {Math.max(0, 5 - interviewCount)} more to unlock earnings.
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-0 border border-[#f2ece0]/[0.06]">
          {[
            { label: "Interviews", value: interviewCount },
            { label: "Avg Rating", value: avgRating > 0 ? avgRating.toFixed(1) : "—", suffix: avgRating > 0 ? "/ 5" : null },
            { label: "Per Session", value: currentTier.is_monetized ? `₹${currentTier.rate_inr.toLocaleString("en-IN")}` : "Free" },
          ].map((s, i) => (
            <div key={s.label} className={`px-4 py-4 text-center ${i > 0 ? "border-l border-[#f2ece0]/[0.06]" : ""}`}>
              <div className="font-display text-2xl" style={{ color: i === 2 && currentTier.is_monetized ? "#c9a96e" : "#f2ece0" }}>
                {s.value}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#6b6459] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-[#a8a094]">
                Progress to {TIER_ICONS[nextTier.tier]} {nextTier.tier}
              </div>
              <div className="text-[11px] text-[#c9a96e]">{progressPct}%</div>
            </div>
            <div className="h-1.5 bg-[#f2ece0]/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(to right, ${currentTier.color}, ${nextTier.color})` }}
              />
            </div>
            <div className="mt-3 text-xs text-[#6b6459]">
              {nextTier.description}
            </div>
            <div className="flex gap-3 mt-2 text-[11px] text-[#a8a094]">
              <span>📊 Need: <strong className="text-[#f2ece0]">{nextTier.min_interviews} interviews</strong></span>
              <span>⭐ Need: <strong className="text-[#f2ece0]">{nextTier.min_rating}+ rating</strong></span>
            </div>
          </div>
        )}

        {isElite && (
          <div className="text-center py-2 text-sm text-[#c9a96e]">
            💎 Elite status — maximum earnings unlocked!
          </div>
        )}

        {/* All Tiers Overview */}
        <div>
          <div className="overline mb-3">All Tiers</div>
          <div className="space-y-2">
            {tiers.map((t, i) => {
              const isCurrent = t.tier === currentTierName;
              const isUnlocked = TIER_ORDER.indexOf(t.tier) <= currentTierIndex;
              return (
                <div
                  key={t.tier}
                  className={`flex items-center justify-between py-2 px-3 text-sm ${
                    isCurrent ? "border border-[#c9a96e]/30 bg-[#c9a96e]/5" : "border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{TIER_ICONS[t.tier]}</span>
                    <span className={isUnlocked ? "text-[#f2ece0]" : "text-[#6b6459]"}>{t.tier}</span>
                    {isCurrent && <span className="text-[9px] uppercase tracking-wider text-[#c9a96e] border border-[#c9a96e]/40 px-1.5 py-0.5">Current</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px]" style={{ color: isUnlocked ? t.color : "#3a3530" }}>
                      {t.is_monetized ? `₹${t.rate_inr.toLocaleString("en-IN")}/session` : "Free"}
                    </span>
                    {isUnlocked && !isCurrent && <CheckCircle size={12} className="text-[#c9a96e]" />}
                    {!isUnlocked && <Lock size={12} className="text-[#3a3530]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
