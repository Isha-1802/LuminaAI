import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Code2, MessagesSquare, Terminal, Users, ArrowLeft, ArrowUpRight, Sparkles, Layers, Activity, LineChart, GitBranch, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import { useAuth } from "@/context/AuthContext";

const ROOMS = {
  technical: {
    icon: Code2,
    no: "01",
    name: "Technical",
    tagline: "Systems, tradeoffs, deep architecture.",
    essence:
      "A senior engineer's drawing room. The counsel probes how you think about systems — scaling, consistency, failure modes — and keeps pulling the thread until it finds the edge of what you know.",
    steps: [
      { t: "The opening sketch", d: "You're given a real product constraint — not a puzzle. The counsel asks how you'd shape the system around it." },
      { t: "The tradeoff ladder", d: "Every answer earns a sharper follow-up. Caching, queues, consistency — the room recalibrates to your level as you speak." },
      { t: "The design defence", d: "You defend your architecture the way you would in a real design review — including what you'd cut under deadline." },
    ],
    different: [
      { icon: Sparkles, t: "Résumé-aware", d: "Questions are written against the systems you claim to have built — not from a generic bank." },
      { icon: Layers, t: "Adaptive depth", d: "Warm-up to elite. Struggle and it teaches; excel and it escalates. Fixed question lists can't do either." },
      { icon: GitBranch, t: "Branching follow-ups", d: "The counsel follows your answer, not a script. Two candidates never get the same interview." },
    ],
    samples: [
      "Your feed service p99 just tripled after a cache change. Walk me through your first fifteen minutes.",
      "You claimed event-driven architecture on your résumé — where does it break down?",
      "Design rate limiting for an API with burst-heavy B2B clients. What do you trade away?",
    ],
  },
  behavioral: {
    icon: MessagesSquare,
    no: "02",
    name: "Behavioural",
    tagline: "STAR stories, judgement, culture.",
    essence:
      "The room where careers are actually decided. The counsel listens like a hiring manager — for ownership, conflict handled with grace, and the difference between 'we' and 'I'.",
    steps: [
      { t: "The story draw", d: "Prompts pull from your real experience — the counsel has read your dossier and asks about your projects by name." },
      { t: "The pressure test", d: "Vague answers get gently cornered: What did you do? What broke? Who disagreed with you?" },
      { t: "The read-back", d: "Your verdict shows how each story landed — structure, specificity, and the confidence your voice carried." },
    ],
    different: [
      { icon: Activity, t: "Speech & composure analytics", d: "Filler words, pauses, pace — measured from how you actually answered, not self-reported." },
      { icon: Sparkles, t: "Asks about your life", d: "Other sites hand you 'Tell me about a conflict'. This room asks about the migration you led in March." },
      { icon: LineChart, t: "Leadership heatmap", d: "Ownership and judgement scored as their own axes — so you know which stories to retire." },
    ],
    samples: [
      "Your résumé says you 'led' the checkout rewrite — what did leading actually look like week to week?",
      "Tell me about a decision your team disagreed with. What did you do after losing the argument?",
      "What's a piece of feedback that stung? What changed because of it?",
    ],
  },
  coding: {
    icon: Terminal,
    no: "03",
    name: "Coding",
    tagline: "Algorithms, complexity, elegance.",
    essence:
      "Not a judge that returns 'Wrong Answer'. A counsel that watches your reasoning — the approach, the complexity call, the moment you should have stepped back — and coaches like a staff engineer pairing with you.",
    steps: [
      { t: "The problem, framed", d: "Algorithmic problems calibrated to the role and difficulty you chose — explained like a colleague would, not a judge." },
      { t: "Thinking out loud", d: "You narrate your approach before writing. The counsel challenges complexity claims and hints only when you're truly stuck." },
      { t: "The elegance pass", d: "Working isn't done. The counsel pushes for the cleaner cut — naming, structure, the O(n) hiding inside your O(n log n)." },
    ],
    different: [
      { icon: Layers, t: "Hints, not verdicts", d: "LeetCode tells you that you failed. This room teaches you mid-problem, then lowers the ladder if needed." },
      { icon: Sparkles, t: "Reasoning is graded", d: "Your explanation and complexity analysis count — because interviews grade them too." },
      { icon: ShieldCheck, t: "No leaderboard anxiety", d: "A private room. Struggle safely here so you don't struggle publicly there." },
    ],
    samples: [
      "Merge overlapping meetings — but justify your sort before you write it.",
      "You said O(1) space. Your recursion says otherwise — where's the stack?",
      "It passes. Now make it readable enough that a reviewer approves it in one pass.",
    ],
  },
  hr: {
    icon: Users,
    no: "04",
    name: "Screening",
    tagline: "Motivation, comp, logistics.",
    essence:
      "The thirty minutes everyone under-prepares. The counsel plays the recruiter — motivation, salary, the 'why us' — and shows you how your answers sound from the other side of the call.",
    steps: [
      { t: "The narrative", d: "Why this role, why now, why you. The counsel checks your story is coherent — and that it matches your résumé." },
      { t: "The money round", d: "Compensation questions asked the way recruiters actually ask them, with pushback when you anchor poorly." },
      { t: "The red-flag sweep", d: "Gaps, short stints, career pivots — rehearsed until they sound like decisions, not accidents." },
    ],
    different: [
      { icon: Sparkles, t: "The neglected round", d: "Prep sites obsess over algorithms. Most rejections happen here — this room takes it seriously." },
      { icon: Activity, t: "Confidence is measured", d: "Hesitation before the salary answer shows up in your analytics. You'll see it, then fix it." },
      { icon: ShieldCheck, t: "Private negotiation reps", d: "Practise saying the number out loud before a recruiter hears it." },
    ],
    samples: [
      "Walk me through your last three roles in ninety seconds.",
      "What are your compensation expectations? — and no, 'flexible' isn't an answer.",
      "You left after eleven months. What happened?",
    ],
  },
};

const ROOM_BG = "https://images.unsplash.com/photo-1710438399422-2fca27686bcd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBnbGFzcyUyMHRleHR1cmV8ZW58MHx8fHwxNzgzMTg0OTI4fDA&ixlib=rb-4.1.0&q=85";

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
};

export default function RoomDetail() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const room = ROOMS[roomId];

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0] flex items-center justify-center">
        <div className="text-center">
          <div className="font-display italic text-6xl text-[#c68b73]/50 mb-4">"</div>
          <p className="text-[#a8a094]">This room doesn't exist.</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 overline hover:text-[#c68b73]"><ArrowLeft size={12} /> Return</Link>
        </div>
      </div>
    );
  }

  const enter = () => nav(user ? `/interview/new` : "/auth?mode=signup");
  const others = Object.entries(ROOMS).filter(([id]) => id !== roomId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]" data-testid="room-detail-page">
      <Navbar />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.16] bg-drift" style={{ backgroundImage: `url(${ROOM_BG})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a09]/70 via-[#0c0a09]/85 to-[#0c0a09]" />
      </div>
      <AmbientBackground variant="warm" />

      <div className="pt-[112px] max-w-[1200px] mx-auto px-6 md:px-12 pb-24 relative">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="pb-12">
          <div className="flex items-center justify-between mb-10">
            <Link to="/" className="inline-flex items-center gap-2 overline hover:text-[#c68b73] transition-colors" data-testid="room-back-link">
              <ArrowLeft size={12} /> All rooms
            </Link>
            <div className="overline-gold">Room Nº {room.no}</div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-10">
            <div>
              <div className="neo-inset inline-flex items-center justify-center w-20 h-20 mb-8">
                <room.icon size={30} className="text-[#c68b73]" />
              </div>
              <h1 className="font-display text-[56px] md:text-[88px] leading-[0.92] tracking-[-0.03em]" data-testid="room-title">
                The <span className="font-display-italic text-shimmer">{room.name}</span> room.
              </h1>
              <p className="mt-6 max-w-xl text-[#a8a094] leading-relaxed text-lg">{room.tagline}</p>
            </div>
            <button
              onClick={enter}
              className="neo-pill inline-flex items-center gap-3 px-9 py-5 text-[11px] uppercase tracking-[0.32em] text-[#c68b73] font-medium"
              data-testid="room-enter-btn"
            >
              Enter this room <ArrowUpRight size={14} />
            </button>
          </div>
        </motion.div>

        {/* Essence */}
        <motion.div {...fadeUp} className="neo-card p-10 md:p-14 mb-16">
          <div className="overline-gold mb-6">§ What happens here</div>
          <p className="font-display text-2xl md:text-[34px] leading-[1.35] tracking-[-0.01em] max-w-3xl">{room.essence}</p>
        </motion.div>

        {/* How it unfolds */}
        <motion.div {...fadeUp} className="mb-16">
          <div className="overline-gold mb-8">§ How the hour unfolds</div>
          <div className="grid md:grid-cols-3 gap-6">
            {room.steps.map((s, i) => (
              <motion.div
                key={s.t}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.12 }}
                className="neo-card p-8 md:p-10"
                data-testid={`room-step-${i}`}
              >
                <div className="neo-inset inline-flex items-center justify-center w-12 h-12 mb-8">
                  <span className="font-display italic text-[#c68b73] text-xl">{i + 1}</span>
                </div>
                <h3 className="font-display text-2xl tracking-tight">{s.t}</h3>
                <p className="mt-3 text-sm text-[#a8a094] leading-relaxed">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Why different */}
        <motion.div {...fadeUp} className="neo-card p-10 md:p-14 mb-16">
          <div className="overline-gold mb-3">§ Why it's different here</div>
          <h2 className="font-display text-3xl md:text-5xl tracking-tight mb-10">
            Not another <span className="font-display-italic">question bank</span>.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {room.different.map((d, i) => (
              <div key={d.t} className="neo-inset p-7" data-testid={`room-diff-${i}`}>
                <d.icon size={18} className="text-[#c68b73] mb-5" />
                <h3 className="font-display text-xl tracking-tight">{d.t}</h3>
                <p className="mt-2 text-sm text-[#a8a094] leading-relaxed">{d.d}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sample lines */}
        <motion.div {...fadeUp} className="mb-16">
          <div className="overline-gold mb-8">§ Heard in this room</div>
          <div className="space-y-5">
            {room.samples.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
                className="neo-inset px-8 py-6 flex items-baseline gap-6"
                data-testid={`room-sample-${i}`}
              >
                <span className="font-display italic text-[#c68b73] text-2xl shrink-0">0{i + 1}</span>
                <p className="font-display text-lg md:text-xl leading-relaxed text-[#f2ece0]/90">"{q}"</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Every room ends with */}
        <motion.div {...fadeUp} className="neo-card p-10 md:p-14 mb-16">
          <div className="overline-gold mb-3">§ Every room ends the same way</div>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-8">The Verdict.</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { v: "6-axis", l: "skill heatmap" },
              { v: "Speech", l: "composure analytics" },
              { v: "PDF", l: "boardroom report" },
              { v: "Share", l: "link for mentors" },
            ].map((m) => (
              <div key={m.l} className="neo-inset px-6 py-8 text-center">
                <div className="font-display text-2xl md:text-3xl text-[#c68b73]">{m.v}</div>
                <div className="overline mt-3">{m.l}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Other rooms + CTA */}
        <motion.div {...fadeUp} className="flex flex-wrap items-center justify-between gap-8">
          <div className="flex flex-wrap gap-4">
            {others.map(([id, r]) => (
              <Link key={id} to={`/rooms/${id}`} className="neo-pill inline-flex items-center gap-3 px-6 py-3.5 text-[10px] uppercase tracking-[0.28em] text-[#a8a094] hover:text-[#c68b73]" data-testid={`room-link-${id}`}>
                <r.icon size={13} /> {r.name}
              </Link>
            ))}
          </div>
          <button
            onClick={enter}
            className="neo-pill inline-flex items-center gap-3 px-9 py-5 text-[11px] uppercase tracking-[0.32em] text-[#c68b73] font-medium"
            data-testid="room-enter-bottom-btn"
          >
            Begin the rehearsal <ArrowUpRight size={14} />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
