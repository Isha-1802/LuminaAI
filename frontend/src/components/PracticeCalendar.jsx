import { motion } from "framer-motion";
import { Flame, CalendarDays, Trophy, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const GOLD = "#c68b73";
const MUTE = "#a8a094";

const dayOfMonth = (iso) => String(new Date(iso + "T00:00:00Z").getUTCDate());

function GraphTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[#0c0a09] border border-[#c68b73]/40 px-3 py-2 rounded-lg text-xs">
      <span className="font-display text-lg text-[#c68b73]">{p.count}</span>
      <span className="text-[#a8a094] ml-1.5">session{p.count === 1 ? "" : "s"}</span>
      <div className="text-[#a8a094] mt-0.5 uppercase tracking-wider text-[9px]">{p.date}</div>
    </div>
  );
}

// Gold intensity scale — 0 sessions → faint cell, 3+ → full gold
const cellColor = (count) => {
  if (count <= 0) return "rgba(242,236,224,0.05)";
  if (count === 1) return "rgba(198,139,115,0.35)";
  if (count === 2) return "rgba(198,139,115,0.65)";
  return "#c68b73";
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PracticeCalendar({ data }) {
  if (!data) return null;
  const { days, current_streak, longest_streak, active_days, total_sessions } = data;

  // Pad the front so columns align to weeks (Mon = row 0)
  const firstDow = (new Date(days[0].date + "T00:00:00Z").getUTCDay() + 6) % 7;
  const cells = [...Array(firstDow).fill(null), ...days];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Month label for a week: shown when the month changes at that column
  const monthOfWeek = (week) => {
    const first = week.find(Boolean);
    return first ? new Date(first.date + "T00:00:00Z").getUTCMonth() : null;
  };

  const stats = [
    { icon: Flame, label: "Current streak", value: current_streak, suffix: current_streak === 1 ? "day" : "days", hot: current_streak > 0 },
    { icon: Trophy, label: "Longest streak", value: longest_streak, suffix: longest_streak === 1 ? "day" : "days" },
    { icon: CalendarDays, label: "Active days", value: active_days, suffix: "of 119" },
    { icon: Zap, label: "Sessions", value: total_sessions, suffix: "total" },
  ];

  return (
    <div data-testid="practice-calendar">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <div className="overline-gold mb-2">§ Practice Rhythm</div>
          <h3 className="font-display text-3xl tracking-tight">Show up daily. The calendar remembers.</h3>
        </div>
      </div>

      {/* Streak stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="px-5 py-6 rounded-xl bg-[#0c0a09]/40 border border-[#f2ece0]/[0.08]"
            data-testid={`streak-stat-${s.label.toLowerCase().replace(/ /g, "-")}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <s.icon size={13} className={s.hot ? "text-[#e2b48c]" : "text-[#c68b73]"} />
              <span className="overline">{s.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-display text-4xl tracking-tight ${s.hot ? "text-[#e2b48c]" : "text-[#f2ece0]"}`}>
                {s.value}
              </span>
              <span className="text-[#6b6459] text-xs">{s.suffix}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Contribution graph — sessions per day, last 30 days */}
      <div className="mb-10" data-testid="contribution-graph">
        <div className="flex items-baseline justify-between mb-4">
          <span className="overline text-[#f2ece0]/80">Contribution graph — last 30 days</span>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={days.slice(-30)} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
              <CartesianGrid stroke="rgba(242,236,224,0.06)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={dayOfMonth}
                tick={{ fill: MUTE, fontSize: 10 }}
                axisLine={{ stroke: "rgba(242,236,224,0.1)" }}
                tickLine={false}
                interval={1}
              />
              <YAxis
                domain={[0, (dataMax) => Math.max(5, dataMax)]}
                allowDecimals={false}
                tick={{ fill: MUTE, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<GraphTooltip />} cursor={{ stroke: "rgba(198,139,115,0.3)" }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={GOLD}
                strokeWidth={2}
                dot={{ r: 3, fill: "#0c0a09", stroke: GOLD, strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: GOLD }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Contribution grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[640px]">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1.5 ml-8">
            {weeks.map((week, wi) => {
              const m = monthOfWeek(week);
              const prev = wi > 0 ? monthOfWeek(weeks[wi - 1]) : null;
              return (
                <div key={wi} className="w-[14px] shrink-0 overline text-[8px] text-[#6b6459]">
                  {m !== null && m !== prev ? MONTHS[m] : ""}
                </div>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] w-7 shrink-0 mr-1">
              {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
                <div key={i} className="h-[14px] flex items-center overline text-[8px] text-[#6b6459]">{d}</div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, di) => {
                  const day = week[di];
                  if (!day) return <div key={di} className="w-[14px] h-[14px]" />;
                  return (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: wi * 0.01 }}
                      className="w-[14px] h-[14px] rounded-[3px] hover:ring-1 hover:ring-[#c68b73] transition-shadow"
                      style={{ background: cellColor(day.count) }}
                      title={`${day.date} — ${day.count} session${day.count === 1 ? "" : "s"}`}
                      data-count={day.count}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 ml-8">
            <span className="overline text-[9px]">Less</span>
            {[0, 1, 2, 3].map((c) => (
              <span key={c} className="w-[12px] h-[12px] rounded-[3px]" style={{ background: cellColor(c) }} />
            ))}
            <span className="overline text-[9px]">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
