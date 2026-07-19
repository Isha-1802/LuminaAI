import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileSearch, X, Loader2, CheckCircle2, AlertTriangle, Wrench, Tags } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const scoreTone = (s) => (s >= 80 ? "text-[#c68b73]" : s >= 60 ? "text-[#f2ece0]" : s >= 40 ? "text-[#e2b48c]" : "text-[#8a5052]");

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 overline-gold mb-3">
        <Icon size={12} /> {title}
      </div>
      {children}
    </div>
  );
}

export default function ResumeVerdict({ resume }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);

  const openVerdict = async () => {
    setOpen(true);
    if (report) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/resumes/${resume.resume_id}/analyze`);
      setReport(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Analysis failed");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openVerdict}
        className="inline-flex items-center gap-1.5 overline text-[#c68b73] hover:text-[#f2ece0] transition-colors shrink-0"
        data-testid={`resume-verdict-btn-${resume.resume_id}`}
      >
        <FileSearch size={11} /> The Verdict
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8"
            data-testid="resume-verdict-modal"
          >
            <div className="absolute inset-0 bg-[#0c0a09]/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#12100e]/95 backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[0_24px_80px_rgba(0,0,0,0.7)] p-8 md:p-10"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-5 right-5 text-[#6b6459] hover:text-[#f2ece0] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="overline-gold mb-2">§ The Verdict</div>
              <h3 className="font-display text-3xl tracking-tight mb-1 pr-10">
                {resume.original_filename || "Your resume"}
              </h3>

              {busy && (
                <div className="py-20 text-center">
                  <Loader2 size={22} className="animate-spin text-[#c68b73] mx-auto mb-4" />
                  <p className="text-sm text-[#a8a094]">The counsel is reading your resume…</p>
                </div>
              )}

              {report && (
                <div className="mt-6 space-y-8">
                  <div className="flex items-end gap-6 flex-wrap">
                    <div>
                      <span className={`font-display text-7xl tracking-tight ${scoreTone(report.overall_score)}`}>
                        {report.overall_score}
                      </span>
                      <span className="text-[#6b6459] text-sm ml-1">/100</span>
                    </div>
                    <p className="font-display-italic text-xl text-[#f2ece0] leading-snug max-w-md pb-2">
                      "{report.verdict}"
                    </p>
                  </div>

                  <p className="text-sm text-[#a8a094] leading-relaxed">{report.summary}</p>

                  <div className="grid md:grid-cols-2 gap-8">
                    <Section icon={CheckCircle2} title="What works">
                      <ul className="space-y-2">
                        {(report.strengths || []).map((s, i) => (
                          <li key={i} className="text-sm text-[#e8e2d6] flex gap-2.5">
                            <span className="text-[#c68b73] shrink-0">✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </Section>
                    <Section icon={AlertTriangle} title="What hurts">
                      <ul className="space-y-2">
                        {(report.weaknesses || []).map((s, i) => (
                          <li key={i} className="text-sm text-[#e8e2d6] flex gap-2.5">
                            <span className="text-[#8a5052] shrink-0">✗</span> {s}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  </div>

                  {(report.missing_keywords || []).length > 0 && (
                    <Section icon={Tags} title="Keywords recruiters expected">
                      <div className="flex flex-wrap gap-2">
                        {report.missing_keywords.map((k) => (
                          <span key={k} className="rounded-full border border-[#e2b48c]/30 bg-[#e2b48c]/[0.06] px-3 py-1.5 text-xs text-[#e2b48c]">
                            {k}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {(report.quick_fixes || []).length > 0 && (
                    <Section icon={Wrench} title="Fix in under an hour">
                      <ol className="space-y-2.5">
                        {report.quick_fixes.map((f, i) => (
                          <li key={i} className="text-sm text-[#e8e2d6] flex gap-3">
                            <span className="font-display italic text-[#c68b73] shrink-0">0{i + 1}</span> {f}
                          </li>
                        ))}
                      </ol>
                    </Section>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
