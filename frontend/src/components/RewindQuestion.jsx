import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Loader2, ArrowRight, TrendingUp, TrendingDown, Minus, Send } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const scoreTone = (s) =>
  s >= 80 ? "text-[#c68b73]" : s >= 60 ? "text-[#f2ece0]" : s >= 40 ? "text-[#e2b48c]" : "text-[#8a5052]";

function DeltaBadge({ delta }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tone = delta > 0 ? "text-[#c68b73] border-[#c68b73]/40" : delta < 0 ? "text-[#8a5052] border-[#8a5052]/50" : "text-[#a8a094] border-[#f2ece0]/20";
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-full ${tone}`}>
      <Icon size={13} />
      {delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

/**
 * RewindQuestion — re-answer one flagged question and see attempt-1 → attempt-2
 * with a score delta. `initialRewinds` seeds any attempts already stored on the report.
 */
export default function RewindQuestion({ interviewId, qIndex, initialRewinds = [], originalScore }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  // result: { original_score, new_score, delta, verdict, feedback }
  const lastStored = initialRewinds.length ? initialRewinds[initialRewinds.length - 1] : null;
  const [result, setResult] = useState(
    lastStored
      ? {
          original_score: originalScore ?? 0,
          new_score: lastStored.score,
          delta: lastStored.score - (originalScore ?? 0),
          verdict: lastStored.verdict,
          feedback: lastStored.feedback,
        }
      : null
  );
  const [attempts, setAttempts] = useState(initialRewinds.length);

  const submit = async () => {
    if (answer.trim().length < 15) {
      toast.error("Give it a real attempt — a few sentences at least.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/interviews/${interviewId}/rewind/${qIndex}`, { answer: answer.trim() });
      setResult(data);
      setAttempts((n) => n + 1);
      setAnswer("");
      if (data.delta > 0) toast.success(`Improved by ${data.delta} points!`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't score that — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4" data-testid={`rewind-${qIndex}`}>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#c68b73] hover:text-[#f2ece0] transition-colors"
          data-testid={`rewind-open-${qIndex}`}
        >
          <RotateCcw size={12} /> {result ? "Try again" : "Rewind — re-answer this"}
        </button>
      )}

      {/* Result: attempt 1 → attempt 2 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-5 rounded-xl bg-[#c68b73]/[0.05] border border-[#c68b73]/25"
            data-testid={`rewind-result-${qIndex}`}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <div className="overline mb-1">First</div>
                <div className={`font-display text-3xl ${scoreTone(result.original_score)}`}>{result.original_score}</div>
              </div>
              <ArrowRight size={18} className="text-[#6b6459] mt-4" />
              <div className="text-center">
                <div className="overline mb-1">Now</div>
                <div className={`font-display text-3xl ${scoreTone(result.new_score)}`}>{result.new_score}</div>
              </div>
              <div className="ml-2 mt-4">
                <DeltaBadge delta={result.delta} />
              </div>
              {attempts > 1 && (
                <span className="ml-auto mt-4 overline text-[#6b6459]">Attempt {attempts}</span>
              )}
            </div>
            {result.feedback && <p className="text-sm text-[#a8a094] leading-relaxed">{result.feedback}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer box */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Answer it again — better this time…"
              className="w-full bg-[#0c0a09]/60 border border-[#f2ece0]/[0.12] rounded-xl px-4 py-3 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c68b73] transition-colors resize-none"
              data-testid={`rewind-input-${qIndex}`}
            />
            <div className="flex items-center justify-end gap-3 mt-3">
              <button
                type="button"
                onClick={() => { setOpen(false); setAnswer(""); }}
                className="text-[10px] uppercase tracking-[0.28em] text-[#a8a094] hover:text-[#f2ece0] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="inline-flex items-center gap-2 border border-[#c68b73] text-[#f2ece0] px-5 py-2.5 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all disabled:opacity-50"
                data-testid={`rewind-submit-${qIndex}`}
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Score it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
