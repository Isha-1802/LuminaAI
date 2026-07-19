import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

const AXES = [
  { key: "communication", label: "Communication" },
  { key: "problem_solving", label: "Problem Solving" },
  { key: "technical_depth", label: "Technical Depth" },
  { key: "confidence", label: "Confidence" },
  { key: "leadership", label: "Leadership" },
  { key: "system_design", label: "System Design" },
];

const GOLD = "#c68b73";
const IVORY = "#f2ece0";

const cellTone = (v) => {
  // 0 -> oxblood/dim, 100 -> bright gold
  const t = Math.max(0, Math.min(100, v)) / 100;
  const r = Math.round(90 + t * (201 - 90));
  const g = Math.round(26 + t * (169 - 26));
  const b = Math.round(36 + t * (110 - 36));
  return `rgb(${r},${g},${b})`;
};

export default function InterviewHeatmap({ data = {} }) {
  const chartData = AXES.map((a) => ({ axis: a.label, value: data[a.key] ?? 0 }));

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-center" data-testid="interview-heatmap">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="lg:col-span-5 h-[320px] md:h-[380px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} outerRadius="72%">
            <PolarGrid stroke="rgba(242,236,224,0.1)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#a8a094", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}
            />
            <Radar
              dataKey="value"
              stroke={GOLD}
              fill={GOLD}
              fillOpacity={0.22}
              strokeWidth={1.5}
              isAnimationActive
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="lg:col-span-7 space-y-5">
        {AXES.map((a, i) => {
          const v = Math.round(data[a.key] ?? 0);
          return (
            <div key={a.key} data-testid={`heatmap-row-${a.key}`}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="overline">{a.label}</span>
                <span className="font-display text-xl" style={{ color: cellTone(v) }}>{v}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 20 }).map((_, cellIdx) => {
                  const filled = cellIdx < Math.round((v / 100) * 20);
                  return (
                    <motion.div
                      key={cellIdx}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.06 + cellIdx * 0.012 }}
                      className="h-3 flex-1"
                      style={{
                        background: filled ? cellTone(v) : "rgba(242,236,224,0.06)",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
