import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { ArrowUpRight, Loader2, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const INTERVIEW_TYPES = [
  { id: "technical", label: "Technical", d: "Systems, tradeoffs, deep architecture." },
  { id: "behavioral", label: "Behavioural", d: "STAR stories, judgement, culture." },
  { id: "coding", label: "Coding", d: "Algorithms, complexity, elegance." },
  { id: "hr", label: "Screening", d: "Motivation, comp, logistics." },
  { id: "panel", label: "Panel", d: "3-person roundtable · rotating counsels." },
];
const DIFFICULTIES = [
  { id: "easy", label: "Warm-up" },
  { id: "medium", label: "Standard" },
  { id: "hard", label: "Elite" },
];
const DEFAULT_PANEL = [
  { name: "Priya", role: "Engineering Manager", style: "warm, story-driven, systems-minded" },
  { name: "Ola", role: "Staff Engineer", style: "precise, probing, tradeoff-focused" },
  { name: "Ren", role: "Cross-functional partner", style: "product-minded, curious, empathetic" },
];

export default function NewInterview() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const kitParam = sp.get("kit");
  const [models, setModels] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [ateliers, setAteliers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    role_title: "",
    interview_type: "technical",
    difficulty: "medium",
    num_questions: 5,
    model_id: "gemini-3-flash-preview",
    resume_id: "",
    atelier_id: "",
    panel_config: DEFAULT_PANEL,
    kit_id: kitParam || null,
  });

  useEffect(() => {
    (async () => {
      try {
        const [m, r, a] = await Promise.all([api.get("/models"), api.get("/resumes"), api.get("/ateliers")]);
        setModels(m.data);
        setResumes(r.data);
        setAteliers(a.data);
        if (kitParam) {
          try {
            const { data: kit } = await api.get(`/kits/${kitParam}`);
            setForm((f) => ({
              ...f,
              role_title: kit.role_title || f.role_title,
              interview_type: kit.interview_type || f.interview_type,
              difficulty: kit.difficulty || f.difficulty,
              num_questions: kit.num_questions || f.num_questions,
              atelier_id: kit.atelier_id || "",
              panel_config: kit.panel_config?.length ? kit.panel_config : DEFAULT_PANEL,
              kit_id: kit.kit_id,
            }));
            toast.success(`Kit "${kit.name}" loaded`);
          } catch {}
        }
      } catch {}
    })();
    // eslint-disable-next-line
  }, []);

  const updatePanel = (idx, key, val) => {
    setForm((f) => {
      const p = [...(f.panel_config || DEFAULT_PANEL)];
      p[idx] = { ...p[idx], [key]: val };
      return { ...f, panel_config: p };
    });
  };
  const addPanelist = () => {
    setForm((f) => ({ ...f, panel_config: [...(f.panel_config || []), { name: "", role: "", style: "" }] }));
  };
  const removePanelist = (i) => {
    setForm((f) => ({ ...f, panel_config: (f.panel_config || []).filter((_, j) => j !== i) }));
  };

  const start = async () => {
    if (!form.role_title.trim()) {
      toast.error("Give the role a title.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        resume_id: form.resume_id || null,
        atelier_id: form.atelier_id || null,
        panel_config: form.interview_type === "panel" ? (form.panel_config || []).filter((p) => p.name && p.role) : null,
      };
      if (payload.interview_type === "panel" && (!payload.panel_config || payload.panel_config.length < 2)) {
        toast.error("Panel needs at least 2 counsels");
        setBusy(false);
        return;
      }
      const { data } = await api.post("/interviews", payload);
      nav(`/interview/${data.interview_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start the rehearsal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0]" data-testid="new-interview-page">
      <Navbar />
      <div className="pt-[112px] max-w-[1200px] mx-auto px-6 md:px-12 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="border-b border-[#f2ece0]/[0.08] pb-10 mb-14">
          <div className="flex items-center justify-between mb-6">
            <div className="overline-gold">§ Composition — New Rehearsal</div>
            <div className="overline">Volume I</div>
          </div>
          <h1 className="font-display text-[56px] md:text-[80px] leading-[0.94] tracking-[-0.03em]">
            Compose the <span className="font-display-italic text-shimmer">room</span>.
          </h1>
          <p className="mt-6 text-[#a8a094] max-w-xl leading-relaxed">
            Set the stage. Every choice — the role, the register, the AI counsel — shapes the rehearsal that follows.
          </p>
        </motion.div>

        <div className="space-y-16">
          {/* Role */}
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4">
              <div className="overline-gold mb-3">Chapter I</div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">The role you're chasing</h2>
              <p className="mt-3 text-sm text-[#a8a094]">Be specific.</p>
            </div>
            <div className="lg:col-span-8">
              <input type="text" placeholder="e.g. Senior Product Designer at Airbnb"
                value={form.role_title}
                onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                className="w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-4 pt-2 font-display text-3xl md:text-4xl tracking-tight text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c9a96e]"
                data-testid="role-title-input" />
            </div>
          </div>

          {/* Atelier picker */}
          <div className="grid lg:grid-cols-12 gap-8 items-start border-t border-[#f2ece0]/[0.06] pt-16">
            <div className="lg:col-span-4">
              <div className="overline-gold mb-3">Chapter II</div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">The Atelier</h2>
              <p className="mt-3 text-sm text-[#a8a094]">Optional — tune to a company's known interviewing style.</p>
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-0 border border-[#f2ece0]/[0.08]" data-testid="ateliers-grid">
              <button onClick={() => setForm({ ...form, atelier_id: "" })}
                className={`text-left p-6 border-b border-r border-[#f2ece0]/[0.08] transition-all ${
                  !form.atelier_id ? "bg-[#f2ece0] text-[#0c0a09]" : "hover:bg-[#f2ece0]/[0.02]"
                }`}
                data-testid="atelier-none">
                <div className="overline">Nº 00</div>
                <div className="font-display text-xl mt-2 tracking-tight">Independent</div>
                <div className="text-[10px] mt-1 opacity-70">No company tuning</div>
              </button>
              {ateliers.map((a, i) => (
                <button key={a.id} onClick={() => setForm({ ...form, atelier_id: a.id })}
                  className={`text-left p-6 relative transition-all ${
                    form.atelier_id === a.id ? "bg-[#f2ece0] text-[#0c0a09]" : "hover:bg-[#f2ece0]/[0.02]"
                  } ${((i + 1) % 3 !== 2) ? "md:border-r" : ""} border-r border-b border-[#f2ece0]/[0.08]`}
                  data-testid={`atelier-${a.id}`}
                  style={{ borderLeftColor: form.atelier_id === a.id ? a.accent : undefined }}>
                  <div className="overline flex items-center gap-2">
                    Nº 0{i + 1}
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.accent }} />
                  </div>
                  <div className="font-display text-xl mt-2 tracking-tight">{a.name}</div>
                  <div className={`text-[10px] mt-1 ${form.atelier_id === a.id ? "text-[#0c0a09]/70" : "text-[#a8a094]"}`}>{a.tagline}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Register */}
          <div className="grid lg:grid-cols-12 gap-8 items-start border-t border-[#f2ece0]/[0.06] pt-16">
            <div className="lg:col-span-4">
              <div className="overline-gold mb-3">Chapter III</div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">The register</h2>
              <p className="mt-3 text-sm text-[#a8a094]">Which room?</p>
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-0 border border-[#f2ece0]/[0.08]">
              {INTERVIEW_TYPES.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setForm({ ...form, interview_type: t.id })}
                  className={`text-left p-6 md:p-8 relative transition-all duration-500 border-b border-[#f2ece0]/[0.08] ${
                    ((i + 1) % 3 !== 0) ? "md:border-r" : ""
                  } ${((i + 1) % 2 !== 0) ? "border-r" : ""} lg:border-r-0 ${
                    form.interview_type === t.id ? "bg-[#f2ece0] text-[#0c0a09]" : "bg-transparent hover:bg-[#f2ece0]/[0.02] text-[#f2ece0]"
                  }`}
                  data-testid={`type-${t.id}`}
                >
                  <div className={`overline ${form.interview_type === t.id ? "text-[#0c0a09]/60" : "text-[#c9a96e]"}`}>0{i + 1}</div>
                  <div className="font-display text-2xl md:text-3xl tracking-tight mt-3">{t.label}</div>
                  <div className={`text-xs mt-2 leading-relaxed ${form.interview_type === t.id ? "text-[#0c0a09]/70" : "text-[#a8a094]"}`}>{t.d}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Panel configuration */}
          {form.interview_type === "panel" && (
            <div className="grid lg:grid-cols-12 gap-8 items-start border-t border-[#f2ece0]/[0.06] pt-16" data-testid="panel-config">
              <div className="lg:col-span-4">
                <div className="overline-gold mb-3">Chapter III · b</div>
                <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">Compose the panel</h2>
                <p className="mt-3 text-sm text-[#a8a094]">2–4 counsels. Each takes a rotating turn — like a real roundtable.</p>
              </div>
              <div className="lg:col-span-8 space-y-3">
                {(form.panel_config || []).map((p, i) => (
                  <div key={i} className="grid grid-cols-12 gap-3 items-center border border-[#f2ece0]/[0.08] p-4" data-testid={`panelist-${i}`}>
                    <div className="col-span-1 font-display italic text-[#c9a96e] text-2xl">0{i + 1}</div>
                    <input value={p.name} onChange={(e) => updatePanel(i, "name", e.target.value)}
                      placeholder="Name" data-testid={`panelist-name-${i}`}
                      className="col-span-3 bg-transparent border-b border-[#f2ece0]/[0.15] pb-1 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c9a96e]" />
                    <input value={p.role} onChange={(e) => updatePanel(i, "role", e.target.value)}
                      placeholder="Role (e.g. Engineering Manager)" data-testid={`panelist-role-${i}`}
                      className="col-span-4 bg-transparent border-b border-[#f2ece0]/[0.15] pb-1 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c9a96e]" />
                    <input value={p.style || ""} onChange={(e) => updatePanel(i, "style", e.target.value)}
                      placeholder="Style" data-testid={`panelist-style-${i}`}
                      className="col-span-3 bg-transparent border-b border-[#f2ece0]/[0.15] pb-1 text-sm text-[#a8a094] focus:outline-none focus:border-[#c9a96e]" />
                    <button onClick={() => removePanelist(i)} className="col-span-1 text-[#8a5052] hover:text-[#f2ece0]" data-testid={`remove-panelist-${i}`}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {(form.panel_config || []).length < 4 && (
                  <button onClick={addPanelist} className="inline-flex items-center gap-2 border border-[#c9a96e]/40 px-4 py-2 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all" data-testid="add-panelist">
                    <Plus size={11} /> Add counsel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div className="grid lg:grid-cols-12 gap-8 items-center border-t border-[#f2ece0]/[0.06] pt-16">
            <div className="lg:col-span-4">
              <div className="overline-gold mb-3">Chapter IV</div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">The temperature</h2>
            </div>
            <div className="lg:col-span-8 flex items-stretch border border-[#f2ece0]/[0.08]">
              {DIFFICULTIES.map((d, i) => (
                <button key={d.id} onClick={() => setForm({ ...form, difficulty: d.id })}
                  className={`flex-1 py-5 text-[11px] uppercase tracking-[0.32em] transition-all duration-500 ${
                    form.difficulty === d.id ? "bg-[#f2ece0] text-[#0c0a09]" : "text-[#a8a094] hover:text-[#f2ece0]"
                  } ${i > 0 ? "border-l border-[#f2ece0]/[0.08]" : ""}`}
                  data-testid={`difficulty-${d.id}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI counsel */}
          <div className="grid lg:grid-cols-12 gap-8 items-start border-t border-[#f2ece0]/[0.06] pt-16">
            <div className="lg:col-span-4">
              <div className="overline-gold mb-3">Chapter V</div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">Cast the counsel</h2>
              <p className="mt-3 text-sm text-[#a8a094]">Which intellect powers the rehearsal.</p>
            </div>
            <div className="lg:col-span-8 space-y-0 border border-[#f2ece0]/[0.08]">
              {models.map((m, i) => (
                <button key={m.id} onClick={() => setForm({ ...form, model_id: m.id })}
                  className={`w-full text-left px-8 py-6 grid grid-cols-12 gap-4 items-center transition-all duration-300 ${
                    form.model_id === m.id ? "bg-[#f2ece0] text-[#0c0a09]" : "hover:bg-[#f2ece0]/[0.02]"
                  } ${i > 0 ? "border-t border-[#f2ece0]/[0.08]" : ""}`}
                  data-testid={`model-${m.id}`}>
                  <div className={`col-span-1 font-display italic text-2xl text-[#c9a96e]`}>0{i + 1}</div>
                  <div className="col-span-6">
                    <div className="font-display text-2xl tracking-tight">{m.label}</div>
                    <div className={`overline ${form.model_id === m.id ? "text-[#0c0a09]/50" : ""}`}>{m.family}</div>
                  </div>
                  <div className={`col-span-5 text-xs ${form.model_id === m.id ? "text-[#0c0a09]/70" : "text-[#a8a094]"}`}>
                    {m.id.includes("claude") && "Deep · patient probing"}
                    {m.id.includes("gpt") && "Balanced · versatile"}
                    {m.id.includes("gemini") && "Swift · currently the swiftest counsel"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Resume */}
          {resumes.length > 0 && (
            <div className="grid lg:grid-cols-12 gap-8 items-start border-t border-[#f2ece0]/[0.06] pt-16">
              <div className="lg:col-span-4">
                <div className="overline-gold mb-3">Chapter VI</div>
                <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">Anchor to a résumé</h2>
              </div>
              <div className="lg:col-span-8">
                <select value={form.resume_id} onChange={(e) => setForm({ ...form, resume_id: e.target.value })}
                  className="w-full bg-transparent border border-[#f2ece0]/[0.15] px-5 py-4 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c9a96e]"
                  data-testid="resume-select">
                  <option value="" className="bg-[#0c0a09]">— None (generic interview) —</option>
                  {resumes.map((r) => <option key={r.resume_id} value={r.resume_id} className="bg-[#0c0a09]">{r.original_filename}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Length */}
          <div className="grid lg:grid-cols-12 gap-8 items-center border-t border-[#f2ece0]/[0.06] pt-16">
            <div className="lg:col-span-4">
              <div className="overline-gold mb-3">Chapter VII</div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight leading-tight">The length</h2>
            </div>
            <div className="lg:col-span-8">
              <div className="flex items-baseline gap-6 mb-6">
                <span className="font-display text-7xl tracking-[-0.03em] text-[#c9a96e]">{form.num_questions}</span>
                <span className="overline">Questions</span>
              </div>
              <input type="range" min={3} max={12} step={1} value={form.num_questions}
                onChange={(e) => setForm({ ...form, num_questions: Number(e.target.value) })}
                className="w-full" data-testid="num-questions-input" />
            </div>
          </div>

          {/* Begin */}
          <div className="border-t border-[#f2ece0]/[0.06] pt-16">
            <button onClick={start} disabled={busy}
              className="group inline-flex items-center gap-4 border border-[#c9a96e] text-[#f2ece0] px-10 py-5 text-[11px] uppercase tracking-[0.32em] hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all duration-500 disabled:opacity-60"
              data-testid="start-interview-btn">
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              {form.interview_type === "panel" ? "Enter the roundtable" : "Enter the room"}
              <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
