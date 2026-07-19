import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

const GOLD = "#c68b73";
const IVORY = "#f2ece0";
const MUTE = "#a8a094";
const OXBLOOD = "#8a5052";

const AXIS_LABELS = {
  communication: "Communication",
  problem_solving: "Problem Solving",
  technical_depth: "Technical Depth",
  confidence: "Confidence",
  leadership: "Leadership",
  system_design: "System Design",
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function TrendBadge({ delta }) {
  if (delta == null) return null;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tone = delta > 0 ? "text-[#c68b73]" : delta < 0 ? "text-[#8a5052]" : "text-[#6b6459]";
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${tone}`}>
      <Icon size={12} />
      {delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[#0c0a09] border border-[#c68b73]/40 px-4 py-3 rounded-lg text-xs">
      <div className="font-display text-lg text-[#c68b73]">{p.score}/100</div>
      <div className="text-[#f2ece0] mt-1">{p.role_title}</div>
      <div className="text-[#a8a094] mt-0.5 uppercase tracking-wider text-[9px]">
        {p.interview_type} · {p.difficulty} · {fmtDate(p.date)}
      </div>
    </div>
  );
}

export default function ProgressAnalytics({ data }) {
  if (!data) return null;

  // Not enough rehearsals yet — keep the section visible with an invitation
  if (data.timeline.length < 2) {
    return (
      <div data-testid="progress-analytics-empty">
        <div className="overline-gold mb-2">§ Trajectory</div>
        <h3 className="font-display text-3xl tracking-tight mb-6">Score over time</h3>
        <div className="rounded-xl border border-dashed border-[#f2ece0]/[0.15] py-16 text-center">
          <div className="font-display italic text-5xl text-[#c68b73]/40 mb-4">~</div>
          <p className="text-sm text-[#a8a094] max-w-sm mx-auto leading-relaxed">
            Your performance chart draws itself here after your first two completed
            rehearsals. {data.timeline.length === 1 ? "One down — one to go." : "Start your first one today."}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.timeline.map((t, i) => ({ ...t, idx: i + 1 }));
  const { skills, weak_areas: weakAreas, benchmarks, trend_delta: trendDelta, average_score: avgScore } = data;

  return (
    <div className="space-y-8" data-testid="progress-analytics">
      {/* Score trajectory */}
      <div>
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="overline-gold mb-2">§ Trajectory</div>
            <h3 className="font-display text-3xl tracking-tight">Score over time</h3>
          </div>
          {trendDelta != null && (
            <div className="text-right">
              <div className="overline mb-1">Last 5 vs previous 5</div>
              <span className={`font-display text-3xl ${trendDelta >= 0 ? "text-[#c68b73]" : "text-[#8a5052]"}`}>
                {trendDelta > 0 ? "+" : ""}{trendDelta}
              </span>
            </div>
          )}
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(242,236,224,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fill: MUTE, fontSize: 10 }}
                axisLine={{ stroke: "rgba(242,236,224,0.1)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: MUTE, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(198,139,115,0.3)" }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke={GOLD}
                strokeWidth={1.5}
                fill="url(#scoreFill)"
                dot={{ r: 3, fill: "#0c0a09", stroke: GOLD, strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: GOLD }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div>
          <div className="overline-gold mb-2">§ Refinement Needed</div>
          <h3 className="font-display text-3xl tracking-tight mb-6">Where you're losing points</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weakAreas.map((w, i) => (
              <motion.div
                key={w.axis}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="p-6 rounded-xl bg-[#8a5052]/[0.08] border border-[#8a5052]/25"
                data-testid={`weak-area-${w.axis}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-2 overline text-[#e2b48c]">
                    <AlertTriangle size={11} /> {AXIS_LABELS[w.axis]}
                  </span>
                  <TrendBadge delta={w.delta} />
                </div>
                <div className="font-display text-4xl text-[#8a5052] mb-3">{Math.round(w.average)}</div>
                <p className="text-sm text-[#a8a094] leading-relaxed">{w.suggestion}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Benchmarks */}
      {benchmarks && (
        <div>
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="overline-gold mb-2">§ Standing</div>
              <h3 className="font-display text-3xl tracking-tight">You vs the house</h3>
            </div>
            <div className="overline">Across {benchmarks.sample_size} rehearsals platform-wide</div>
          </div>

          <div className="flex items-baseline gap-8 mb-8">
            <div>
              <div className="overline mb-1">Your average</div>
              <span className="font-display text-5xl text-[#c68b73]">{avgScore ?? "—"}</span>
            </div>
            <div>
              <div className="overline mb-1">House average</div>
              <span className="font-display text-5xl text-[#6b6459]">{benchmarks.average_score}</span>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(AXIS_LABELS).map(([axis, label]) => {
              const you = skills[axis]?.average;
              const house = benchmarks.skills[axis];
              if (you == null && house == null) return null;
              return (
                <div key={axis} data-testid={`benchmark-${axis}`}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="overline">{label}</span>
                    <span className="text-xs text-[#a8a094]">
                      <span className="text-[#c68b73]">{you != null ? Math.round(you) : "—"}</span>
                      {" / "}
                      <span>{house != null ? Math.round(house) : "—"} house</span>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-[#f2ece0]/[0.06] overflow-hidden">
                    {house != null && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-[#f2ece0]/[0.15]"
                        style={{ width: `${house}%` }}
                      />
                    )}
                    {you != null && (
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${you}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: you >= (house ?? 0) ? GOLD : OXBLOOD }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
