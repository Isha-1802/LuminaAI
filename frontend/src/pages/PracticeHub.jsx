import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Cpu, Users, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import Ripple from "@/components/Ripple";
import TiltCard from "@/components/TiltCard";
import TextReveal from "@/components/TextReveal";

const GLASS = "rounded-2xl bg-[#f2ece0]/[0.05] backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.5)]";

const OPTIONS = [
  {
    id: "ai",
    to: "/interview/new",
    icon: Cpu,
    number: "01",
    overline: "The Counsel",
    title: "Practice with AI",
    italic: "Rehearse in private.",
    body: "Face Lumina's AI counsel — technical, behavioral, coding, or a full panel. Instant scoring, feedback, and a written report after every session.",
    cta: "Begin a rehearsal",
    image:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    testid: "practice-ai-card",
  },
  {
    id: "human",
    to: "/experts",
    icon: Users,
    number: "02",
    overline: "The Salon",
    title: "Interview with Human",
    italic: "Face a real interviewer.",
    body: "Book a session with a practicing interviewer from the house. Real conversation, real pressure, and a review from someone who hires.",
    cta: "Browse interviewers",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    testid: "practice-human-card",
  },
];

export default function PracticeHub() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen bg-[#0c0a09] text-[#f2ece0]"
      data-testid="practice-hub-page"
    >
      <Navbar />
      <AmbientBackground />

      <div className="pt-[112px] max-w-[1400px] mx-auto px-6 md:px-12 pb-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="border-b border-[#f2ece0]/[0.08] pb-10 mb-14"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="overline-gold">§ Rehearsal Room</div>
            <div className="overline">Choose your counsel</div>
          </div>
          <h1 className="font-display text-[52px] md:text-[72px] leading-[0.94] tracking-[-0.03em]">
            <TextReveal text="How will you" />{" "}
            <span className="font-display-italic text-shimmer">rehearse</span>{" "}
            <TextReveal text="today?" delay={0.4} />
          </h1>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {OPTIONS.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.12 }}
            >
              <TiltCard strength={6} className="h-full">
                <Ripple className="block h-full">
                  <Link
                    to={o.to}
                    className={`group relative flex flex-col justify-between h-full overflow-hidden ${GLASS} hover:border-[#c68b73]/40 transition-all duration-500`}
                    data-testid={o.testid}
                  >
                    {/* Cinematic backdrop — zooms slowly on hover */}
                    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-[0.22] group-hover:opacity-[0.32] group-hover:scale-[1.06] transition-all duration-[1200ms] ease-out"
                        style={{ backgroundImage: `url(${o.image})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-[#0c0a09]/75 to-[#0c0a09]/35" />
                    </div>

                    <div className="relative p-10 md:p-12">
                      <div className="flex items-center justify-between mb-10">
                        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-[#c68b73]/40 text-[#c68b73] bg-[#0c0a09]/50 backdrop-blur-md group-hover:bg-[#c68b73] group-hover:text-[#0c0a09] transition-all duration-500">
                          <o.icon size={20} />
                        </span>
                        <span className="font-display italic text-5xl text-[#f2ece0]/20 group-hover:text-[#c68b73]/50 transition-colors duration-500">
                          {o.number}
                        </span>
                      </div>
                      <div className="overline-gold mb-3">{o.overline}</div>
                      <h2 className="font-display text-4xl md:text-5xl tracking-[-0.02em] leading-[1.02]">
                        {o.title}
                        <br />
                        <span className="font-display-italic text-[#a8a094]">{o.italic}</span>
                      </h2>
                      <p className="mt-6 text-[#a8a094] leading-relaxed max-w-md">{o.body}</p>
                    </div>

                    <div className="relative px-10 md:px-12 pb-10 md:pb-12">
                      <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#c68b73] group-hover:text-[#f2ece0] transition-colors">
                        {o.cta}
                        <ArrowUpRight
                          size={14}
                          className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
                        />
                      </span>
                    </div>
                  </Link>
                </Ripple>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
