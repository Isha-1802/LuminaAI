import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SCRIPT = [
  { role: "counsel", text: "Walk me through how you'd architect the checkout flow for a marketplace with international sellers." },
  { role: "you", text: "I'd start by separating the pricing engine from the checkout state machine — pricing needs FX + tax rules per seller region..." },
  { role: "counsel", text: "Good. Now — how do you handle the race between currency conversion and card authorization?" },
  { role: "you", text: "Two-phase: lock the FX quote server-side for 60s while we auth. If the auth fails, we release the quote…" },
  { role: "counsel", text: "Excellent instinct. Let's pressure-test that with a delayed 3DS challenge." },
];

const useTyping = (text, speed = 22) => {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
};

const Bubble = ({ item, active }) => {
  const typed = useTyping(active ? item.text : item.text, 18);
  const isCounsel = item.role === "counsel";
  return (
    <div className={`flex ${isCounsel ? "justify-start" : "justify-end"}`}>
      {isCounsel ? (
        <div className="max-w-[85%] border-l border-[#c68b73]/50 pl-5 py-1">
          <div className="overline-gold text-[9px] mb-2">The Counsel</div>
          <div className="font-display text-lg md:text-xl leading-snug text-[#f2ece0]">
            {typed}
            <span className="inline-block w-2 h-4 bg-[#c68b73] ml-1 align-middle animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="max-w-[80%] bg-[#f2ece0]/95 text-[#0c0a09] px-4 py-3">
          <div className="text-[8px] uppercase tracking-[0.32em] text-[#0c0a09]/50 mb-1">You</div>
          <div className="text-sm">{typed}</div>
        </div>
      )}
    </div>
  );
};

export default function LiveInterviewDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (SCRIPT.length + 1)), 4400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative border border-[#f2ece0]/[0.08] bg-[#0c0a09]/60 backdrop-blur-xl" data-testid="live-demo">
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-[#f2ece0]/[0.08] px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#5a1a24]" />
          <span className="w-2 h-2 rounded-full bg-[#c68b73]" />
          <span className="w-2 h-2 rounded-full bg-[#3a4a3d]" />
        </div>
        <div className="overline-gold text-[9px]">SESSION · SR ENG · STRIPE · TECHNICAL · MEDIUM</div>
        <div className="overline text-[9px]">
          <span className="w-1.5 h-1.5 inline-block bg-[#c68b73] rounded-full mr-2 animate-pulse" /> LIVE
        </div>
      </div>

      <div className="p-8 md:p-10 space-y-6 min-h-[440px] max-h-[440px] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {SCRIPT.slice(0, Math.min(step + 1, SCRIPT.length)).map((item, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Bubble item={item} active={i === step} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom stats bar */}
      <div className="border-t border-[#f2ece0]/[0.08] px-6 py-4 grid grid-cols-4 gap-4">
        {[
          { l: "Depth", v: "84" },
          { l: "Clarity", v: "77" },
          { l: "Confidence", v: "71" },
          { l: "Pace", v: "88" },
        ].map((s) => (
          <div key={s.l} className="text-center">
            <div className="overline text-[9px]">{s.l}</div>
            <div className="font-display text-lg text-[#c68b73] mt-0.5">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
