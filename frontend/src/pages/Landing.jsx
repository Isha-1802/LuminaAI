import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Play, Cpu, Code2, MessagesSquare, Users, Zap, ShieldCheck, Radio, Sparkles, TrendingUp, LineChart, Activity, Circle, Layers, GitBranch, Terminal, ChevronDown } from "lucide-react";
import AISceneCore from "@/components/AICore";
import AnimatedCounter from "@/components/AnimatedCounter";
import MagneticButton from "@/components/MagneticButton";
import ScrambleText from "@/components/ScrambleText";
import LiveInterviewDemo from "@/components/LiveInterviewDemo";
import FaqAccordion from "@/components/FaqAccordion";
import Navbar from "@/components/Navbar";

const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
};

const houses = ["Stripe", "Anthropic", "Airbnb", "OpenAI", "Ramp", "Vercel", "Linear", "Notion", "Figma", "Scale", "Perplexity", "Cursor", "Retool"];

const modes = [
  { icon: Code2, name: "Technical", detail: "Systems, tradeoffs, deep architecture." },
  { icon: MessagesSquare, name: "Behavioural", detail: "STAR stories, judgement, culture." },
  { icon: Terminal, name: "Coding", detail: "Algorithms, complexity, elegance." },
  { icon: Users, name: "Screening", detail: "Motivation, comp, logistics." },
];

const counsel = [
  { id: "claude", label: "Claude Sonnet 4.5", family: "Anthropic", trait: "Patient · Deep", stat: [92, 88, 76, 84] },
  { id: "gpt", label: "GPT-5.2", family: "OpenAI", trait: "Balanced · Versatile", stat: [86, 90, 82, 88] },
  { id: "gemini", label: "Gemini 3 Flash", family: "Google", trait: "Swift · Nimble", stat: [78, 84, 96, 82] },
];

const capabilities = [
  { icon: Sparkles, t: "Résumé-aware craft", d: "Questions written against every line of your dossier." },
  { icon: Layers, t: "Adaptive difficulty", d: "Warm-up to elite. The room recalibrates as you speak." },
  { icon: ShieldCheck, t: "Private by design", d: "TLS transit, encrypted storage, deletable in one click." },
  { icon: LineChart, t: "Multi-axis scoring", d: "Technical, communication, problem solving, confidence." },
  { icon: GitBranch, t: "Branching lines", d: "Follow-ups follow you, not a template." },
  { icon: Activity, t: "Real-time sentiment", d: "Pace and confidence read as you compose." },
  { icon: Radio, t: "Voice — coming Spring", d: "Whisper transcription. Studio TTS voices." },
  { icon: Zap, t: "Under 800ms replies", d: "Even mid-thought, the counsel keeps up." },
];

const roadmap = [
  { q: "Q1", t: "Written rehearsals · multi-model counsel · résumé aware", live: true },
  { q: "Q2", t: "Voice interviews · webcam analysis · confidence heatmaps", live: false },
  { q: "Q3", t: "Live team rehearsals · panel simulations · interviewer console", live: false },
  { q: "Q4", t: "Company-specific atelier · offer negotiation coach", live: false },
];

export default function Landing() {
  const heroRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const cursorXs = useSpring(cursorX, { stiffness: 240, damping: 22 });
  const cursorYs = useSpring(cursorY, { stiffness: 240, damping: 22 });
  const [cursorActive, setCursorActive] = useState(false);

  useEffect(() => {
    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseRef.current.x = nx;
      mouseRef.current.y = ny;
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [cursorX, cursorY]);

  const { scrollYProgress } = useScroll();
  const bgY1 = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
  const bgY2 = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  // Hero parallax bindings
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroScroll, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(heroScroll, [0, 0.8], [1, 0]);
  const heroScale = useTransform(heroScroll, [0, 1], [1, 0.9]);

  return (
    <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0] overflow-hidden" data-testid="landing-page">
      <Navbar />

      {/* Cursor blob */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[200] w-6 h-6 rounded-full mix-blend-difference hidden md:block"
        style={{ x: cursorXs, y: cursorYs, translateX: "-50%", translateY: "-50%", background: "#c9a96e", opacity: cursorActive ? 0.9 : 0.6 }}
      />

      {/* Ambient parallax layers */}
      <motion.div style={{ y: bgY1 }} className="pointer-events-none fixed inset-0 opacity-90">
        <div className="absolute -top-32 -right-32 w-[620px] h-[620px] rounded-full bg-[#c9a96e]/[0.06] blur-[140px]" />
        <div className="absolute top-1/2 -left-40 w-[520px] h-[520px] rounded-full bg-[#5a1a24]/[0.09] blur-[160px]" />
      </motion.div>
      <motion.div style={{ y: bgY2 }} className="pointer-events-none fixed inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[880px] h-[280px] rounded-full bg-[#c9a96e]/[0.04] blur-[140px]" />
      </motion.div>

      {/* Fixed HUD chrome */}
      <div className="hidden lg:block fixed top-[80px] left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-[1400px] mx-auto px-12 flex items-center justify-between">
          <div className="overline-gold text-[9px]">MMXXVI · SF · <span className="text-[#f2ece0]">37.7749°N</span></div>
          <div className="overline text-[9px]">
            <span className="w-1.5 h-1.5 inline-block bg-[#c9a96e] rounded-full mr-2 animate-pulse" />
            SYSTEM · NOMINAL
          </div>
        </div>
      </div>

      {/* =========================================== */}
      {/* ==============  HERO  ===================== */}
      {/* =========================================== */}
      <section ref={heroRef} className="relative pt-[128px] md:pt-[152px] pb-24 md:pb-32 min-h-screen" data-testid="hero-section">
        <motion.div style={{ y: heroY, opacity: heroOpacity, scale: heroScale }} className="max-w-[1440px] mx-auto px-6 md:px-12 grid lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left rail */}
          <motion.div {...fadeUp} className="hidden lg:flex lg:col-span-1 flex-col items-start gap-8 pt-4 self-start">
            <div className="vertical-rl overline text-[#c9a96e]">Vol I — Winter Rehearsals · MMXXVI</div>
            <div className="w-px h-24 bg-gradient-to-b from-[#c9a96e]/60 to-transparent" />
            <div className="flex flex-col gap-2 overline text-[9px]">
              <span>№01 · Method</span>
              <span>№02 · Salon</span>
              <span>№03 · Atelier</span>
            </div>
          </motion.div>

          {/* Center type */}
          <div className="lg:col-span-6 relative z-10">
            <motion.div {...fadeUp}>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-px bg-[#c9a96e]" />
                <span className="overline-gold" data-testid="hero-badge">MMXXVI · Private Beta · Volume I</span>
              </div>

              <h1 className="font-display text-[64px] md:text-[96px] lg:text-[120px] leading-[0.92] tracking-[-0.035em]">
                <div>Where <span className="font-display-italic text-shimmer">Intelligence</span></div>
                <div className="mt-1">Meets <span className="font-display-italic">Opportunity</span>
                  <span className="text-[#c9a96e] inline-block ml-1">.</span>
                </div>
              </h1>

              <div className="mt-10 max-w-[540px] relative pl-6 border-l border-[#c9a96e]/40">
                <p className="text-[#a8a094] leading-relaxed text-[15px] md:text-[16px]">
                  A private atelier of AI counsels — Claude, GPT-5.2, Gemini — that read your résumé, conduct cinematic
                  rehearsals, and return a boardroom report before your next real one.
                </p>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
                <MagneticButton>
                  <Link
                    to="/auth?mode=signup"
                    className="group inline-flex items-center gap-3 bg-[#f2ece0] text-[#0c0a09] px-8 py-4 text-[11px] uppercase tracking-[0.32em] font-medium hover:bg-[#c9a96e] transition-all duration-500"
                    data-testid="hero-start-btn"
                    onMouseEnter={() => setCursorActive(true)}
                    onMouseLeave={() => setCursorActive(false)}
                  >
                    <Play size={11} className="fill-[#0c0a09]" />
                    Login / Sign Up
                    <ArrowUpRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
                  </Link>
                </MagneticButton>
                <a href="#method" className="group inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] hover:text-[#c9a96e] transition-colors" data-testid="hero-explore-btn">
                  <span className="w-6 h-px bg-[#c9a96e] group-hover:w-12 transition-all duration-500" />
                  The Method
                </a>
              </div>

              {/* Micro stats */}
              <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg border-t border-[#f2ece0]/[0.08] pt-8">
                {[
                  { v: 40, s: "k+", l: "Rehearsals conducted" },
                  { v: 92, s: "%", l: "Reported confidence lift" },
                  { v: 4.9, s: "/5", l: "Salon rating", d: 1 },
                ].map((m, i) => (
                  <div key={i}>
                    <div className="font-display text-3xl md:text-4xl text-[#c9a96e]">
                      <AnimatedCounter value={m.v} suffix={m.s} decimals={m.d} />
                    </div>
                    <div className="overline mt-2">{m.l}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: futuristic 3D scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative"
          >
            <div className="absolute -top-2 -right-2 md:-right-4 z-10 text-right">
              <div className="overline-gold mb-1">The Counsel</div>
              <div className="font-display italic text-[#f2ece0]/70 text-3xl">nº 01</div>
            </div>

            <AISceneCore mouse={mouseRef} />

            <div className="mt-4 flex justify-between items-baseline text-[9px] uppercase tracking-[0.32em] text-[#6b6459]">
              <span>Cognitive Core · v1.4</span>
              <span>Cast in warm brass</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="overline text-[9px]">Scroll</span>
          <ChevronDown size={14} className="text-[#c9a96e]" />
        </motion.div>
      </section>

      {/* =========================================== */}
      {/* ==========  MARQUEE OF HOUSES ============= */}
      {/* =========================================== */}
      <section className="relative border-y border-[#f2ece0]/[0.08] py-6 overflow-hidden" data-testid="marquee-section">
        <div className="flex animate-ticker whitespace-nowrap">
          {[...houses, ...houses, ...houses].map((h, i) => (
            <div key={i} className="flex items-center gap-16 px-8">
              <span className="font-display italic text-[26px] md:text-[36px] text-[#f2ece0]/40 hover:text-[#c9a96e] transition-colors duration-500">{h}</span>
              <span className="text-[#c9a96e]/40">✧</span>
            </div>
          ))}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 left-6 md:left-12 overline-gold bg-[#0c0a09] pr-4 z-10">Rehearsed for</div>
      </section>

      {/* =========================================== */}
      {/* ==============  LIVE METRICS  ============= */}
      {/* =========================================== */}
      <section className="relative py-24 md:py-32" data-testid="metrics-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[#f2ece0]/[0.08]">
            {[
              { v: 40000, l: "Rehearsals conducted", suffix: "+" },
              { v: 3, l: "AI counsels available" },
              { v: 92, l: "Confidence lift", suffix: "%" },
              { v: 800, l: "ms avg response", prefix: "<" },
            ].map((m, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className={`p-10 md:p-12 relative ${i > 0 ? "md:border-l border-[#f2ece0]/[0.08]" : ""} ${i % 2 === 1 ? "border-l border-[#f2ece0]/[0.08] md:border-l-0" : ""} ${i > 1 ? "border-t md:border-t-0 border-[#f2ece0]/[0.08]" : ""} group hover:bg-[#f2ece0]/[0.015] transition-colors duration-500`}
              >
                <div className="overline mb-8">{m.l}</div>
                <div className="font-display text-5xl md:text-6xl tracking-[-0.03em] text-[#c9a96e]">
                  <AnimatedCounter value={m.v} prefix={m.prefix} suffix={m.suffix} />
                </div>
                <div className="absolute bottom-0 left-0 h-px w-0 bg-[#c9a96e] group-hover:w-full transition-all duration-700" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =========================================== */}
      {/* ==============  THE METHOD  =============== */}
      {/* =========================================== */}
      <section id="method" className="relative py-32 md:py-40" data-testid="features-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-14">
            <motion.div {...fadeUp} className="lg:col-span-5 lg:sticky lg:top-32 self-start">
              <div className="overline-gold mb-6">§ I — The Method</div>
              <h2 className="font-display text-[52px] md:text-[72px] leading-[0.94] tracking-[-0.025em]">
                <ScrambleText text="Rehearse in" duration={1.2} />
                <br />
                <span className="font-display-italic text-[#c9a96e]">private</span>.
                <br />
                <ScrambleText text="Perform in" duration={1.2} />
                <br />
                <span className="font-display-italic">public</span>.
              </h2>
              <p className="mt-8 max-w-md text-[#a8a094] leading-relaxed">
                Three quiet acts. One decisive performance. An interview coach for the ones who prepare like editors, not students.
              </p>
              <div className="mt-10 flex items-center gap-4">
                <div className="w-16 h-px bg-[#c9a96e]" />
                <span className="overline">Est. MMXXVI · San Francisco</span>
              </div>
            </motion.div>

            <div className="lg:col-span-7 space-y-0">
              {[
                { n: "I", title: "Consultation", body: "Your dossier is read line by line. Every commitment becomes a possible question." },
                { n: "II", title: "The Rehearsal", body: "A cinematic mock interview by a private AI counsel. Behavioural, technical, coding — your choice." },
                { n: "III", title: "The Verdict", body: "A boardroom-grade report. Multi-axis scores, precise revisions, next moves — with an editor's composure." },
              ].map((m, i) => (
                <motion.div
                  key={m.n}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="group border-t border-[#f2ece0]/[0.08] py-10 md:py-14 grid grid-cols-12 gap-4 items-start hover:bg-[#f2ece0]/[0.015] transition-colors duration-500"
                  data-testid={`feature-card-${i}`}
                >
                  <div className="col-span-2 md:col-span-1 pt-2">
                    <div className="font-display italic text-[#c9a96e] text-3xl">{m.n}</div>
                  </div>
                  <div className="col-span-10 md:col-span-11 pr-4">
                    <h3 className="font-display text-3xl md:text-4xl tracking-tight text-[#f2ece0] group-hover:text-[#c9a96e] transition-colors duration-500">
                      {m.title}
                    </h3>
                    <p className="mt-4 text-[#a8a094] leading-relaxed max-w-2xl">{m.body}</p>
                  </div>
                </motion.div>
              ))}
              <div className="border-t border-[#f2ece0]/[0.08]" />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================== */}
      {/* ===========  LIVE INTERVIEW DEMO  ========== */}
      {/* =========================================== */}
      <section className="relative py-32 md:py-40 border-t border-[#f2ece0]/[0.08]" data-testid="demo-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          <motion.div {...fadeUp} className="lg:col-span-5">
            <div className="overline-gold mb-6">§ II — Behind the Curtain</div>
            <h2 className="font-display text-[48px] md:text-[64px] leading-[0.96] tracking-[-0.025em]">
              This is not a demo. <br />
              <span className="font-display-italic text-shimmer">This is Tuesday.</span>
            </h2>
            <p className="mt-8 max-w-md text-[#a8a094] leading-relaxed">
              Every rehearsal opens in a live session — the counsel composes questions in real time, weighs your reply,
              and pushes deeper. Below is an unedited excerpt from a Stripe senior engineering rehearsal.
            </p>
            <div className="mt-10 flex flex-wrap gap-6">
              {[
                { l: "Depth", v: 84 },
                { l: "Composure", v: 71 },
                { l: "Speed", v: 88 },
              ].map((s) => (
                <div key={s.l} className="flex-1 min-w-[120px]">
                  <div className="overline mb-2">{s.l}</div>
                  <div className="font-display text-4xl text-[#c9a96e]">
                    <AnimatedCounter value={s.v} />
                  </div>
                  <div className="mt-2 h-px bg-[#f2ece0]/[0.08] relative overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.v}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-y-0 left-0 bg-[#c9a96e]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...fadeUp} className="lg:col-span-7">
            <LiveInterviewDemo />
          </motion.div>
        </div>
      </section>

      {/* =========================================== */}
      {/* ==========  CAPABILITIES BENTO  =========== */}
      {/* =========================================== */}
      <section className="relative py-32 md:py-40" data-testid="capabilities-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="max-w-3xl mb-16">
            <div className="overline-gold mb-6">§ III — Capabilities</div>
            <h2 className="font-display text-[48px] md:text-[72px] leading-[0.96] tracking-[-0.025em]">
              A house of <span className="font-display-italic text-shimmer">counsel</span>,
              <br />not a chatbot.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#f2ece0]/[0.08]">
            {capabilities.map((c, i) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: (i % 4) * 0.08 }}
                className={`p-8 md:p-10 relative group hover:bg-[#f2ece0]/[0.02] transition-colors duration-500 ${
                  i % 4 !== 0 ? "md:border-l border-[#f2ece0]/[0.08]" : ""
                } ${i >= 4 ? "md:border-t border-[#f2ece0]/[0.08]" : ""} border-b md:border-b-0 border-[#f2ece0]/[0.08]`}
                data-testid={`cap-${i}`}
              >
                <div className="flex items-start justify-between mb-8">
                  <c.icon size={20} className="text-[#c9a96e]" />
                  <span className="overline-gold text-[9px]">0{i + 1}</span>
                </div>
                <h3 className="font-display text-2xl tracking-tight leading-tight">{c.t}</h3>
                <p className="mt-3 text-sm text-[#a8a094] leading-relaxed">{c.d}</p>
                <div className="absolute bottom-0 left-0 h-px w-0 bg-[#c9a96e] group-hover:w-full transition-all duration-700" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================== */}
      {/* ==========  AI COUNSEL SHOWCASE  ========== */}
      {/* =========================================== */}
      <section className="relative py-32 md:py-40 border-t border-[#f2ece0]/[0.08]" data-testid="counsel-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="grid lg:grid-cols-12 gap-8 items-end mb-16">
            <div className="lg:col-span-8">
              <div className="overline-gold mb-6">§ IV — The Counsel</div>
              <h2 className="font-display text-[48px] md:text-[72px] leading-[0.96] tracking-[-0.025em]">
                Three intellects. <br /><span className="font-display-italic">One room.</span>
              </h2>
            </div>
            <p className="lg:col-span-4 text-[#a8a094] leading-relaxed">
              Every rehearsal casts the AI counsel of your choosing. Match the intellect to the register.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-0 border border-[#f2ece0]/[0.08]">
            {counsel.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.15 }}
                className={`p-10 md:p-14 relative group hover:bg-[#f2ece0]/[0.02] transition-all duration-500 ${
                  i > 0 ? "md:border-l border-[#f2ece0]/[0.08]" : ""
                } border-t md:border-t-0 border-[#f2ece0]/[0.08] first:border-t-0`}
                data-testid={`counsel-${c.id}`}
              >
                <div className="overline-gold mb-6">Nº 0{i + 1} · {c.family}</div>
                <h3 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05]">
                  {c.label.split(" ").slice(0, -1).join(" ")}
                  <br />
                  <span className="font-display-italic">{c.label.split(" ").slice(-1)[0]}</span>
                </h3>
                <div className="overline mt-6 text-[#c9a96e]">{c.trait}</div>

                {/* Radar-like bars */}
                <div className="mt-10 space-y-4">
                  {["Depth", "Empathy", "Speed", "Range"].map((lbl, j) => (
                    <div key={lbl}>
                      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.28em] text-[#a8a094]">
                        <span>{lbl}</span>
                        <span className="text-[#c9a96e]">{c.stat[j]}</span>
                      </div>
                      <div className="mt-1 h-px bg-[#f2ece0]/[0.08] relative overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${c.stat[j]}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: 0.2 + j * 0.1 }}
                          className="absolute inset-y-0 left-0 bg-[#c9a96e]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#c9a96e]/30 transition-colors duration-500 pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================== */}
      {/* ==========  INTERVIEW MODES  ============== */}
      {/* =========================================== */}
      <section className="relative py-32 md:py-40 border-t border-[#f2ece0]/[0.08]" data-testid="modes-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="mb-16 grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-6">
              <div className="overline-gold mb-6">§ V — Registers</div>
              <h2 className="font-display text-[48px] md:text-[72px] leading-[0.96] tracking-[-0.025em]">
                Four rooms. <br /><span className="font-display-italic text-shimmer">One preparation.</span>
              </h2>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#f2ece0]/[0.08]">
            {modes.map((m, i) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
                className={`relative p-10 md:p-12 group cursor-pointer overflow-hidden hover:bg-[#f2ece0]/[0.03] transition-all duration-500 min-h-[280px] flex flex-col justify-between ${
                  i > 0 ? "md:border-l border-[#f2ece0]/[0.08]" : ""
                } ${i >= 2 ? "lg:border-l lg:border-t-0 border-t border-[#f2ece0]/[0.08]" : ""}`}
                data-testid={`mode-${m.name}`}
                onMouseEnter={() => setCursorActive(true)}
                onMouseLeave={() => setCursorActive(false)}
              >
                <div className="flex items-start justify-between">
                  <motion.div
                    className="relative"
                    whileHover={{ rotate: 15, scale: 1.15 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <m.icon size={28} className="text-[#c9a96e]" />
                  </motion.div>
                  <span className="overline-gold text-[9px]">0{i + 1}</span>
                </div>
                <div>
                  <h3 className="font-display text-3xl md:text-4xl tracking-tight">{m.name}</h3>
                  <p className="mt-4 text-sm text-[#a8a094] leading-relaxed">{m.detail}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[#c9a96e] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-500">
                    Enter <ArrowUpRight size={12} />
                  </div>
                </div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700"
                  style={{ background: "radial-gradient(circle at 70% 30%, rgba(201,169,110,0.09), transparent 60%)" }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================== */}
      {/* ==========  ROADMAP TIMELINE  ============= */}
      {/* =========================================== */}
      <section className="relative py-32 md:py-40 border-t border-[#f2ece0]/[0.08]" data-testid="roadmap-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="mb-16">
            <div className="overline-gold mb-6">§ VI — Almanac MMXXVI</div>
            <h2 className="font-display text-[48px] md:text-[72px] leading-[0.96] tracking-[-0.025em]">
              A season of <span className="font-display-italic">releases</span>.
            </h2>
          </motion.div>

          <div className="relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#c9a96e]/40 to-transparent" />
            {roadmap.map((r, i) => (
              <motion.div
                key={r.q}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className={`relative py-10 md:py-14 grid md:grid-cols-2 gap-8 items-center ${i % 2 ? "md:flex-row-reverse" : ""}`}
                data-testid={`roadmap-${r.q}`}
              >
                <div className={`${i % 2 ? "md:col-start-2 md:text-left" : "md:text-right"} pl-16 md:pl-0`}>
                  <div className="font-display text-6xl md:text-8xl text-[#c9a96e]/60 leading-none">{r.q}</div>
                </div>
                <div className={`${i % 2 ? "md:col-start-1 md:row-start-1" : ""} pl-16 md:pl-12`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Circle size={8} fill={r.live ? "#c9a96e" : "transparent"} className="text-[#c9a96e]" />
                    <span className="overline-gold">{r.live ? "Available now" : "Forthcoming"}</span>
                  </div>
                  <p className="font-display text-2xl md:text-3xl tracking-tight leading-tight text-[#f2ece0]">
                    {r.t}
                  </p>
                </div>
                <div className="absolute left-8 md:left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className={`w-3 h-3 rounded-full ${r.live ? "bg-[#c9a96e] shadow-[0_0_20px_rgba(201,169,110,0.6)]" : "border border-[#c9a96e]/50"}`} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================== */}
      {/* ==========  QUOTE  ======================== */}
      {/* =========================================== */}
      <section className="relative py-32 md:py-40 border-y border-[#f2ece0]/[0.08]" data-testid="quote-section">
        <div className="max-w-[1000px] mx-auto px-6 md:px-12 text-center">
          <motion.div {...fadeUp}>
            <span className="font-display italic text-[#c9a96e] text-7xl leading-none">"</span>
            <blockquote className="font-display text-3xl md:text-5xl leading-[1.15] tracking-[-0.02em] mt-4">
              I've never walked into a room this <span className="font-display-italic text-shimmer">composed</span>.
              The rehearsal was harder than the interview — which is precisely the point.
            </blockquote>
            <div className="mt-10 flex flex-col items-center gap-2">
              <div className="w-8 h-px bg-[#c9a96e]" />
              <span className="overline">M. Kaur — Product Designer, Stripe</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =========================================== */}
      {/* ==========  FAQ  ========================== */}
      {/* =========================================== */}
      <section className="relative py-32 md:py-40" data-testid="faq-section">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="mb-16">
            <div className="overline-gold mb-6">§ VII — Correspondence</div>
            <h2 className="font-display text-[48px] md:text-[72px] leading-[0.96] tracking-[-0.025em]">
              Questions, <span className="font-display-italic">answered</span>.
            </h2>
          </motion.div>
          <FaqAccordion />
        </div>
      </section>

      {/* =========================================== */}
      {/* ==========  ATELIER / CTA  ================ */}
      {/* =========================================== */}
      <section id="pricing" className="relative py-32 md:py-48 border-t border-[#f2ece0]/[0.08]" data-testid="cta-section">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div {...fadeUp} className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <div className="overline-gold mb-6">§ VIII — The Atelier</div>
              <h2 className="font-display text-[64px] md:text-[112px] lg:text-[144px] leading-[0.9] tracking-[-0.038em]">
                Your next room
                <br />
                <span className="font-display-italic text-shimmer">deserves</span>
                <br />
                a rehearsal.
              </h2>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-8">
              <div className="border-l border-[#c9a96e]/40 pl-6">
                <div className="overline mb-2">Complimentary · Private Beta</div>
                <p className="text-[#a8a094] text-sm leading-relaxed">
                  A limited number of seats are open this season. No card. Cancel any time — nothing to cancel.
                </p>
              </div>
              <MagneticButton>
                <Link
                  to="/auth?mode=signup"
                  className="group inline-flex items-center justify-between gap-3 border border-[#c9a96e] text-[#f2ece0] px-8 py-5 hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all duration-500 w-full"
                  data-testid="cta-signup-btn"
                  onMouseEnter={() => setCursorActive(true)}
                  onMouseLeave={() => setCursorActive(false)}
                >
                  <span className="text-[11px] uppercase tracking-[0.32em] font-medium">Sign Up</span>
                  <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </MagneticButton>
              <Link to="/auth?mode=login" className="overline hover:text-[#c9a96e] transition-colors" data-testid="cta-login-link">
                Already have an account? Login →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =========================================== */}
      {/* ==========  FOOTER  ======================= */}
      {/* =========================================== */}
      <footer className="relative border-t border-[#f2ece0]/[0.08] pt-20 pb-10" data-testid="footer">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#c9a96e]" />
                <span className="font-display italic text-3xl">Lumina</span>
              </Link>
              <p className="mt-6 text-[#a8a094] max-w-md leading-relaxed">
                A private atelier for the interview room. Rehearse quietly. Perform decisively.
              </p>
              <div className="mt-10 flex items-center gap-6 overline">
                <a className="hover:text-[#c9a96e] transition-colors" href="#">Instagram</a>
                <a className="hover:text-[#c9a96e] transition-colors" href="#">LinkedIn</a>
                <a className="hover:text-[#c9a96e] transition-colors" href="#">Journal</a>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="overline mb-6 text-[#c9a96e]">The House</div>
              <ul className="space-y-3 text-[#a8a094] text-sm">
                <li><a className="hover:text-[#f2ece0] transition-colors" href="#method">Method</a></li>
                <li><a className="hover:text-[#f2ece0] transition-colors" href="#modes-section">Modes</a></li>
                <li><a className="hover:text-[#f2ece0] transition-colors" href="#pricing">Atelier</a></li>
              </ul>
            </div>
            <div className="lg:col-span-2">
              <div className="overline mb-6 text-[#c9a96e]">Studio</div>
              <ul className="space-y-3 text-[#a8a094] text-sm">
                <li><a className="hover:text-[#f2ece0] transition-colors" href="#">About</a></li>
                <li><a className="hover:text-[#f2ece0] transition-colors" href="#">Careers</a></li>
                <li><a className="hover:text-[#f2ece0] transition-colors" href="#">Press</a></li>
              </ul>
            </div>
            <div className="lg:col-span-3">
              <div className="overline mb-6 text-[#c9a96e]">Correspondence</div>
              <p className="text-[#a8a094] text-sm leading-relaxed">
                hello@lumina.ai
                <br />+1 (415) 555 · 0117
                <br />San Francisco · London
              </p>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-[#f2ece0]/[0.06] flex flex-wrap justify-between items-center gap-4">
            <span className="overline">© MMXXVI Lumina Labs · Bound in San Francisco</span>
            <span className="font-display italic text-[#c9a96e]/70">Rehearse in private. Perform in public.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
