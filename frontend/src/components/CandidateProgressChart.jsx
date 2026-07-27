import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Star, Sparkles, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const CARD =
  "mt-10 p-8 md:p-10 rounded-2xl bg-[#f2ece0]/[0.05] backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.5)]";

const GOLD = "#c68b73";
const MUTE = "#a8a094";

const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function StarRow({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < Math.round(value) ? "text-[#c68b73] fill-[#c68b73]" : "text-[#6b6459]"}
        />
      ))}
    </span>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[#0c0a09] border border-[#c68b73]/40 px-4 py-3 rounded-lg text-xs">
      <div className="flex items-center gap-2">
        <span className="font-display text-lg text-[#c68b73]">{p.stars}</span>
        <StarRow value={p.stars} />
      </div>
      <div className="text-[#f2ece0] mt-1">{p.role_title}</div>
      <div className="text-[#a8a094] mt-0.5 uppercase tracking-wider text-[9px]">
        {p.interview_type} · {fmtDate(p.date)} · {p.score}/100
      </div>
    </div>
  );
}

export default function CandidateProgressChart() {
  const [timeline, setTimeline] = useState(null);

  useEffect(() => {
    api.get("/stats/analytics")
      .then((r) => setTimeline(r.data.timeline || []))
      .catch(() => setTimeline([]));
  }, []);

  // Loading — soft skeleton instead of a blank gap
  if (timeline === null) {
    return (
      <div className={CARD} data-testid="progress-chart-loading">
        <div className="overline-gold mb-2">§ Progress</div>
        <h3 className="font-display text-3xl tracking-tight mb-6">Stars per rehearsal</h3>
        <div className="h-[240px] rounded-xl bg-[#f2ece0]/[0.03] border border-[#f2ece0]/[0.06] flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-[#c68b73]/60" />
        </div>
      </div>
    );
  }

  // Empty — invite them to take their first interview (blank chart baseline + CTA)
  if (timeline.length === 0) {
    return (
      <div className={CARD} data-testid="progress-chart-empty">
        <div className="overline-gold mb-2">§ Progress</div>
        <h3 className="font-display text-3xl tracking-tight mb-2">Stars per rehearsal</h3>
        <p className="text-sm text-[#a8a094] mb-6">Your rating climbs here after each rehearsal.</p>
        {/* Empty 5-star baseline chart so the space reads intentional, not broken */}
        <div className="h-[200px] opacity-40 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[{ x: "—", stars: 0 }, { x: "—", stars: 0 }]} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
              <CartesianGrid stroke="rgba(242,236,224,0.06)" vertical={false} />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fill: MUTE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <XAxis dataKey="x" tick={{ fill: MUTE, fontSize: 10 }} axisLine={{ stroke: "rgba(242,236,224,0.1)" }} tickLine={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-[#c68b73]/[0.06] border border-[#c68b73]/25 px-5 py-4">
          <p className="text-sm text-[#e8e2d6]">
            No rehearsals yet. Complete your first AI interview to start earning stars.
          </p>
          <Link
            to="/interview/new"
            className="shrink-0 inline-flex items-center gap-2 border border-[#c68b73] text-[#f2ece0] px-5 py-2.5 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all"
            data-testid="progress-chart-cta"
          >
            <Sparkles size={12} /> Start your first rehearsal
          </Link>
        </div>
      </div>
    );
  }

  const data = timeline.map((t) => ({ ...t, stars: Math.round((t.score / 20) * 10) / 10 }));
  const latest = data[data.length - 1];
  const avg = Math.round((data.reduce((a, b) => a + b.stars, 0) / data.length) * 10) / 10;

  return (
    <div
      className="mt-10 p-8 md:p-10 rounded-2xl bg-[#f2ece0]/[0.05] backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.5)]"
      data-testid="candidate-progress-chart"
    >
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="overline-gold mb-2">§ Progress</div>
          <h3 className="font-display text-3xl tracking-tight">Stars per rehearsal</h3>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="overline mb-1">Latest</div>
            <div className="flex items-center gap-2 justify-end">
              <span className="font-display text-2xl text-[#c68b73]">{latest.stars}</span>
              <StarRow value={latest.stars} />
            </div>
          </div>
          <div className="text-right">
            <div className="overline mb-1">Average</div>
            <div className="flex items-center gap-2 justify-end">
              <span className="font-display text-2xl text-[#f2ece0]">{avg}</span>
              <StarRow value={avg} />
            </div>
          </div>
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
            <CartesianGrid stroke="rgba(242,236,224,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fill: MUTE, fontSize: 10 }}
              axisLine={{ stroke: "rgba(242,236,224,0.1)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tick={{ fill: MUTE, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(198,139,115,0.3)" }} />
            <Line
              type="monotone"
              dataKey="stars"
              stroke={GOLD}
              strokeWidth={2}
              dot={{ r: 4, fill: "#0c0a09", stroke: GOLD, strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: GOLD }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
