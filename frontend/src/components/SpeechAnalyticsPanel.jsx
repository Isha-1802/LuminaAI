import { motion } from "framer-motion";
import { MessageSquare, Timer, Gauge, Hourglass } from "lucide-react";

const paceLabel = (avgSeconds) => {
  if (!avgSeconds) return "—";
  if (avgSeconds < 8) return "Rapid";
  if (avgSeconds < 20) return "Measured";
  if (avgSeconds < 45) return "Deliberate";
  return "Unhurried";
};

const fillerTone = (count, responses) => {
  const rate = responses ? count / responses : 0;
  if (rate <= 0.5) return "text-[#c68b73]";
  if (rate <= 1.5) return "text-[#f2ece0]";
  return "text-[#e2b48c]";
};

export default function SpeechAnalyticsPanel({ data = {} }) {
  const {
    filler_word_count = 0,
    avg_words_per_response = 0,
    total_responses = 0,
    avg_response_time_seconds = 0,
    longest_pause_seconds = 0,
  } = data;

  const tiles = [
    {
      icon: MessageSquare,
      label: "Filler words",
      value: filler_word_count,
      tone: fillerTone(filler_word_count, total_responses),
      note: `across ${total_responses} response${total_responses === 1 ? "" : "s"}`,
    },
    {
      icon: Gauge,
      label: "Avg. words / response",
      value: avg_words_per_response,
      tone: "text-[#f2ece0]",
      note: "depth of each answer",
    },
    {
      icon: Timer,
      label: "Avg. response time",
      value: `${avg_response_time_seconds}s`,
      tone: "text-[#c68b73]",
      note: paceLabel(avg_response_time_seconds),
    },
    {
      icon: Hourglass,
      label: "Longest pause",
      value: `${longest_pause_seconds}s`,
      tone: longest_pause_seconds > 60 ? "text-[#e2b48c]" : "text-[#f2ece0]",
      note: "before an answer landed",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-[#f2ece0]/[0.08]" data-testid="speech-analytics-panel">
      {tiles.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.08 }}
          className={`p-6 md:p-8 relative group hover:bg-[#f2ece0]/[0.02] transition-colors duration-500 ${
            i > 0 ? "border-l border-[#f2ece0]/[0.08]" : ""
          }`}
          data-testid={`speech-tile-${i}`}
        >
          <t.icon size={16} className="text-[#c68b73] mb-6" />
          <div className={`font-display text-3xl md:text-4xl tracking-tight ${t.tone}`}>{t.value}</div>
          <div className="overline mt-3">{t.label}</div>
          <div className="mt-1 text-xs text-[#6b6459]">{t.note}</div>
          <div className="absolute bottom-0 left-0 h-px w-0 bg-[#c68b73] group-hover:w-full transition-all duration-700" />
        </motion.div>
      ))}
    </div>
  );
}
