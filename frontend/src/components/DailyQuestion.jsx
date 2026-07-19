import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Loader2, Send, CheckCircle2, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const VERDICTS = {
  nailed_it: { label: "Nailed it", tone: "text-[#c68b73] border-[#c68b73]/40" },
  solid: { label: "Solid", tone: "text-[#f2ece0] border-[#f2ece0]/30" },
  needs_work: { label: "Needs work", tone: "text-[#e2b48c] border-[#8a5052]/50" },
};

export default function DailyQuestion({ onAnswered }) {
  const [q, setQ] = useState(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get("/daily/question")
      .then((r) => {
        setQ(r.data);
        if (r.data.answered) setResult({ verdict: r.data.verdict, feedback: r.data.feedback });
      })
      .catch(() => setQ(null));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy || answer.trim().length < 20) {
      if (answer.trim().length < 20) toast.error("Give it a real attempt — a few sentences at least.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/daily/answer", { answer });
      setResult({ verdict: data.verdict, feedback: data.feedback });
      onAnswered?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not submit — try again");
    } finally {
      setBusy(false);
    }
  };

  if (!q) return null;

  const done = !!result;

  return (
    <div data-testid="daily-question-panel">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="overline-gold mb-2 flex items-center gap-2">
            <Flame size={12} className={done ? "text-[#c68b73]" : "text-[#e2b48c]"} />
            § Today's Question — keep the flame
          </div>
          <h3 className="font-display text-3xl tracking-tight">
            {done ? "Done for today. Streak safe." : "One answer keeps the streak alive."}
          </h3>
        </div>
        <span className="overline text-[#a8a094]">
          {q.topic} · {q.difficulty}
        </span>
      </div>

      {q.source === "weak_question" && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-[#e2b48c]/[0.06] border border-[#e2b48c]/25" data-testid="daily-review-banner">
          <RotateCcw size={15} className="text-[#e2b48c] shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="text-[#e2b48c] font-medium">
              Second look{q.review_round > 1 ? ` · round ${q.review_round}` : ""}
            </span>
            <span className="text-[#a8a094]">
              {" "}— you struggled with this one before.
              {q.prior_note ? ` Last time: "${q.prior_note}"` : ""}
            </span>
          </div>
        </div>
      )}

      <p className="text-[#f2ece0] leading-relaxed md:text-lg max-w-3xl mb-6" data-testid="daily-question-text">
        {q.question}
      </p>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.form
            key="form"
            exit={{ opacity: 0, y: -8 }}
            onSubmit={submit}
            className="space-y-4"
          >
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Answer in your own words — 3 to 6 sentences is plenty…"
              className="w-full bg-[#0c0a09]/60 border border-[#f2ece0]/[0.1] rounded-xl px-5 py-4 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c68b73] transition-colors resize-none"
              data-testid="daily-answer-input"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 border border-[#c68b73] text-[#f2ece0] px-6 py-3.5 text-[11px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all disabled:opacity-50"
                data-testid="daily-answer-submit"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Submit &amp; keep streak
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-start gap-5 p-6 rounded-xl bg-[#c68b73]/[0.06] border border-[#c68b73]/25"
            data-testid="daily-question-result"
          >
            <CheckCircle2 size={20} className="text-[#c68b73] shrink-0 mt-0.5" />
            <div>
              <span className={`inline-block text-[9px] uppercase tracking-[0.32em] px-3 py-1.5 border mb-3 ${(VERDICTS[result.verdict] || VERDICTS.solid).tone}`}>
                {(VERDICTS[result.verdict] || VERDICTS.solid).label}
              </span>
              <p className="text-sm text-[#e8e2d6] leading-relaxed">{result.feedback}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
