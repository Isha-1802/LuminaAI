import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const FAQ = [
  { q: "Is this actually intelligent, or scripted?", a: "Fully live — Lumina uses Claude, GPT-5.2 or Gemini as the counsel. Every question is composed on the fly against your résumé and the target role. No scripts." },
  { q: "How is my résumé handled?", a: "Uploaded over TLS, stored in our private object storage, and read only when composing questions. You can delete it at any time. We never share it, sell it, or use it to train third-party models." },
  { q: "Which AI model should I choose?", a: "Claude Sonnet 4.5 is patient and deep — best for behavioural and system design. GPT-5.2 is versatile and swift. Gemini 3 Flash is the fastest counsel — great for rapid drills." },
  { q: "Do I need coding experience?", a: "No — Lumina covers HR, behavioural, product, design, and coding registers. Pick your stage; the counsel calibrates." },
  { q: "What happens after the interview?", a: "A cinematic report: multi-axis scores, strengths, refinements, and three next moves. The full transcript is archived in your Salon for later review." },
  { q: "Is voice available?", a: "Voice interviews (OpenAI Whisper + TTS) arrive in v1.1 — targeted for Spring MMXXVI. Written rehearsals are available today." },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState(0);
  return (
    <div className="border-t border-[#f2ece0]/[0.08]" data-testid="faq-accordion">
      {FAQ.map((item, i) => (
        <div key={i} className="border-b border-[#f2ece0]/[0.08]">
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            className="w-full text-left py-8 grid grid-cols-12 gap-4 items-start group"
            data-testid={`faq-${i}`}
          >
            <div className="col-span-1 font-display italic text-[#c68b73] text-2xl">0{i + 1}</div>
            <div className="col-span-10 font-display text-2xl md:text-3xl tracking-tight text-[#f2ece0] group-hover:text-[#c68b73] transition-colors">
              {item.q}
            </div>
            <div className="col-span-1 flex justify-end pt-2">
              <motion.div animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.4 }}>
                <Plus size={20} className="text-[#c68b73]" />
              </motion.div>
            </div>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="pb-10 grid grid-cols-12 gap-4">
                  <div className="col-span-1" />
                  <div className="col-span-10 text-[#a8a094] leading-relaxed max-w-2xl">{item.a}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
