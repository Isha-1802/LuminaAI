import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Cpu, Sparkles, X, ArrowRight } from "lucide-react";

const KEY = "lumina_onboarded_v1";

const STEPS = [
  { icon: FileText, n: "01", title: "File your résumé", body: "Upload a PDF or DOCX and every interview adapts to your real projects and experience." },
  { icon: Cpu, n: "02", title: "Rehearse with the AI", body: "Pick a role, format, and company. The AI counsel interviews you by voice and scores every answer." },
  { icon: Sparkles, n: "03", title: "Meet your Coach", body: "The floating Coach reads your history — ask it what to fix, why a skill isn't clicking, or what to practice today." },
];

/**
 * OnboardingModal — a one-time welcome for new candidates. Shows once, then
 * remembers via localStorage. Only rendered for candidate accounts.
 */
export default function OnboardingModal({ user }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const isCandidate = user.role === "candidate" || user.role === "interviewee";
    if (isCandidate && !localStorage.getItem(KEY)) setOpen(true);
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const start = () => {
    dismiss();
    nav("/interview/new");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8"
      data-testid="onboarding-modal"
    >
      <div className="absolute inset-0 bg-[#0c0a09]/85 backdrop-blur-sm" onClick={dismiss} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-xl rounded-2xl bg-[#12100e]/95 backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[0_24px_80px_rgba(0,0,0,0.7)] p-8 md:p-10"
      >
            <button
              onClick={dismiss}
              className="absolute top-5 right-5 text-[#6b6459] hover:text-[#f2ece0] transition-colors"
              aria-label="Close"
              data-testid="onboarding-skip"
            >
              <X size={18} />
            </button>

            <div className="overline-gold mb-3">§ Welcome to Lumina</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">
              Your private atelier for the <span className="font-display-italic text-shimmer">interview room.</span>
            </h2>
            <p className="mt-3 text-sm text-[#a8a094] leading-relaxed">
              Three steps to your first rehearsal:
            </p>

            <div className="mt-7 space-y-4">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-4 items-start" data-testid={`onboarding-step-${s.n}`}>
                  <span className="shrink-0 w-11 h-11 rounded-full border border-[#c68b73]/40 text-[#c68b73] flex items-center justify-center">
                    <s.icon size={16} />
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display italic text-[#c68b73] text-lg">{s.n}</span>
                      <span className="font-medium text-[#f2ece0]">{s.title}</span>
                    </div>
                    <p className="text-sm text-[#a8a094] leading-relaxed mt-0.5">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-9 flex items-center justify-between gap-4">
              <button
                onClick={dismiss}
                className="text-[10px] uppercase tracking-[0.28em] text-[#a8a094] hover:text-[#f2ece0] transition-colors"
                data-testid="onboarding-explore"
              >
                I'll explore first
              </button>
              <button
                onClick={start}
                className="inline-flex items-center gap-2 bg-[#c68b73] text-[#0c0a09] px-6 py-3.5 text-[11px] uppercase tracking-[0.28em] font-medium hover:bg-[#e2b48c] transition-all"
                data-testid="onboarding-start"
              >
                Start my first rehearsal <ArrowRight size={14} />
              </button>
            </div>
      </motion.div>
    </div>
  );
}
