import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Plus, Trash2, ArrowUpRight, Loader2, Users, Inbox, Cpu, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const INTERVIEW_TYPES = ["technical", "behavioral", "coding", "hr", "panel"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const fmt = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

const emptyKit = {
  name: "",
  role_title: "",
  interview_type: "technical",
  difficulty: "medium",
  num_questions: 5,
  atelier_id: "",
  notes: "",
};

export default function InterviewerConsole() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("kits");
  const [kits, setKits] = useState([]);
  const [ateliers, setAteliers] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyKit);
  const [busy, setBusy] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    if (user && user.role !== "interviewer") nav("/dashboard", { replace: true });
  }, [user, nav]);

  const refresh = async () => {
    try {
      const [k, a, i] = await Promise.all([
        api.get("/kits"),
        api.get("/ateliers"),
        api.get("/reviews/inbox"),
      ]);
      setKits(k.data);
      setAteliers(a.data);
      setInbox(i.data);
    } catch {}
  };
  useEffect(() => { refresh(); }, []);

  const startNewKit = () => { setForm(emptyKit); setEditing("new"); };
  const editKit = (k) => {
    setForm({ ...emptyKit, ...k, atelier_id: k.atelier_id || "" });
    setEditing(k.kit_id);
  };
  const saveKit = async () => {
    if (!form.name.trim() || !form.role_title.trim()) {
      toast.error("Name and role required"); return;
    }
    setBusy(true);
    try {
      const body = { ...form, atelier_id: form.atelier_id || null };
      if (editing === "new") await api.post("/kits", body);
      else await api.put(`/kits/${editing}`, body);
      toast.success("Kit saved");
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };
  const removeKit = async (kit_id) => {
    if (!window.confirm("Delete this kit?")) return;
    try { await api.delete(`/kits/${kit_id}`); toast.success("Kit deleted"); refresh(); }
    catch { toast.error("Delete failed"); }
  };

  const openShareToken = () => {
    const t = tokenInput.trim();
    if (!t) { toast.error("Paste a share token"); return; }
    nav(`/share/${t.replace(/^shr_/, "shr_")}`);
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0]" data-testid="console-page">
      <Navbar />
      <div className="pt-[112px] max-w-[1400px] mx-auto px-6 md:px-12 pb-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="border-b border-[#f2ece0]/[0.08] pb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="overline-gold">§ Console — Interviewer</div>
            <div className="overline">Vol I · {user?.name}</div>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-8">
            <h1 className="font-display text-[52px] md:text-[72px] leading-[0.94] tracking-[-0.03em]" data-testid="console-title">
              The <span className="font-display-italic text-shimmer">bench</span>.
            </h1>
            <div className="flex gap-2 items-center">
              {[
                { id: "kits", label: "Interview Kits", icon: Cpu },
                { id: "inbox", label: "Review Inbox", icon: Inbox },
                { id: "review", label: "Open a shared link", icon: FileText },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.28em] border transition-all ${
                    tab === t.id ? "border-[#c9a96e] bg-[#c9a96e] text-[#0c0a09]" : "border-[#f2ece0]/15 text-[#a8a094] hover:text-[#f2ece0]"
                  }`}
                  data-testid={`tab-${t.id}`}
                >
                  <t.icon size={11} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {tab === "kits" && (
          <div className="mt-14 grid lg:grid-cols-12 gap-10">
            {/* Kits list */}
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-3xl tracking-tight">Kits</h2>
                <button
                  onClick={startNewKit}
                  className="inline-flex items-center gap-2 border border-[#c9a96e] px-5 py-2.5 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all"
                  data-testid="new-kit-btn"
                >
                  <Plus size={12} /> Compose kit
                </button>
              </div>

              {kits.length === 0 && !editing ? (
                <div className="border border-dashed border-[#f2ece0]/[0.15] py-20 text-center" data-testid="empty-kits">
                  <div className="font-display italic text-5xl text-[#c9a96e]/50 mb-3">"</div>
                  <p className="text-[#a8a094] max-w-md mx-auto">
                    No kits yet. Compose your first template — a role, register, and difficulty — to run repeatable interviews.
                  </p>
                </div>
              ) : (
                <div className="border border-[#f2ece0]/[0.08] divide-y divide-[#f2ece0]/[0.06]" data-testid="kits-list">
                  {kits.map((k) => (
                    <div key={k.kit_id} className="p-6 flex items-start justify-between gap-4 hover:bg-[#f2ece0]/[0.02] transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-2xl tracking-tight text-[#f2ece0]">{k.name}</div>
                        <div className="overline mt-2">
                          {k.role_title} · {k.interview_type} · {k.difficulty} · {k.num_questions} qs
                          {k.atelier_id ? ` · ${k.atelier_id}` : ""}
                        </div>
                        {k.notes && <p className="text-xs text-[#a8a094] mt-3 leading-relaxed">{k.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => editKit(k)} className="text-[10px] uppercase tracking-[0.28em] text-[#c9a96e] hover:text-[#f2ece0]" data-testid={`edit-${k.kit_id}`}>Edit</button>
                        <button onClick={() => removeKit(k.kit_id)} className="text-[#8a5052] hover:text-[#f2ece0]" data-testid={`delete-${k.kit_id}`}><Trash2 size={12} /></button>
                        <button
                          onClick={() => nav(`/interview/new?kit=${k.kit_id}`)}
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.28em] text-[#f2ece0] hover:text-[#c9a96e]"
                          data-testid={`use-${k.kit_id}`}
                        >
                          Rehearse <ArrowUpRight size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Editor / details */}
            <div className="lg:col-span-5">
              {editing ? (
                <div className="border border-[#f2ece0]/[0.08] p-8" data-testid="kit-editor">
                  <div className="overline-gold mb-4">{editing === "new" ? "New Kit" : "Editing kit"}</div>
                  <div className="space-y-4">
                    <div>
                      <label className="overline">Name</label>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="mt-2 w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-2 font-display text-2xl text-[#f2ece0] focus:outline-none focus:border-[#c9a96e]"
                        placeholder="Senior FE Kit"
                        data-testid="kit-name-input" />
                    </div>
                    <div>
                      <label className="overline">Role title</label>
                      <input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                        className="mt-2 w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-2 text-[#f2ece0] focus:outline-none focus:border-[#c9a96e]"
                        placeholder="Senior Frontend Engineer"
                        data-testid="kit-role-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="overline">Register</label>
                        <select value={form.interview_type} onChange={(e) => setForm({ ...form, interview_type: e.target.value })}
                          className="mt-2 w-full bg-transparent border border-[#f2ece0]/[0.15] px-3 py-2 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c9a96e]"
                          data-testid="kit-type-select">
                          {INTERVIEW_TYPES.map((t) => <option key={t} value={t} className="bg-[#0c0a09]">{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="overline">Difficulty</label>
                        <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                          className="mt-2 w-full bg-transparent border border-[#f2ece0]/[0.15] px-3 py-2 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c9a96e]"
                          data-testid="kit-difficulty-select">
                          {DIFFICULTIES.map((d) => <option key={d} value={d} className="bg-[#0c0a09]">{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="overline">Atelier (optional)</label>
                      <select value={form.atelier_id} onChange={(e) => setForm({ ...form, atelier_id: e.target.value })}
                        className="mt-2 w-full bg-transparent border border-[#f2ece0]/[0.15] px-3 py-2 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c9a96e]"
                        data-testid="kit-atelier-select">
                        <option value="" className="bg-[#0c0a09]">— None —</option>
                        {ateliers.map((a) => <option key={a.id} value={a.id} className="bg-[#0c0a09]">{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="overline">Questions ({form.num_questions})</label>
                      <input type="range" min={3} max={12} value={form.num_questions} onChange={(e) => setForm({ ...form, num_questions: Number(e.target.value) })}
                        className="mt-3 w-full" data-testid="kit-num-input" />
                    </div>
                    <div>
                      <label className="overline">Notes</label>
                      <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                        className="mt-2 w-full bg-transparent border border-[#f2ece0]/[0.15] px-3 py-2 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c9a96e]"
                        placeholder="Rubric hints, must-cover topics…"
                        data-testid="kit-notes-input" />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={saveKit} disabled={busy}
                        className="inline-flex items-center gap-2 border border-[#c9a96e] px-6 py-3 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all"
                        data-testid="save-kit-btn">
                        {busy ? <Loader2 size={11} className="animate-spin" /> : null} Save kit
                      </button>
                      <button onClick={() => setEditing(null)} className="text-[10px] uppercase tracking-[0.28em] text-[#a8a094] hover:text-[#f2ece0] px-4" data-testid="cancel-kit-btn">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-[#f2ece0]/[0.08] p-8">
                  <div className="overline-gold mb-4">Guide</div>
                  <p className="text-[#a8a094] leading-relaxed">
                    Kits are your reusable rehearsal templates. Compose one per role, then click <span className="text-[#f2ece0]">Rehearse</span> to run it — the AI counsel takes on your stage.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-[#a8a094]">
                    <li className="flex gap-3"><ChevronRight size={14} className="text-[#c9a96e] mt-1" /> Pair with a curated Atelier for company-specific tuning.</li>
                    <li className="flex gap-3"><ChevronRight size={14} className="text-[#c9a96e] mt-1" /> Panel register spawns a 3-person counsel roundtable by default.</li>
                    <li className="flex gap-3"><ChevronRight size={14} className="text-[#c9a96e] mt-1" /> Use "Open a shared link" tab to review candidate reports.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "inbox" && (
          <div className="mt-14" data-testid="inbox-panel">
            <h2 className="font-display text-3xl tracking-tight mb-6">Review inbox</h2>
            {inbox.length === 0 ? (
              <div className="border border-dashed border-[#f2ece0]/[0.15] py-20 text-center">
                <div className="font-display italic text-5xl text-[#c9a96e]/50 mb-3">"</div>
                <p className="text-[#a8a094] max-w-md mx-auto">
                  Candidates you've reviewed appear here. Open the <span className="text-[#f2ece0]">Open a shared link</span> tab to add your first note.
                </p>
              </div>
            ) : (
              <div className="border border-[#f2ece0]/[0.08] divide-y divide-[#f2ece0]/[0.06]">
                {inbox.map((n, i) => (
                  <div key={n.note_id} className="p-6 grid grid-cols-12 gap-4 items-center hover:bg-[#f2ece0]/[0.02]" data-testid={`inbox-${i}`}>
                    <div className="col-span-1 font-display italic text-[#c9a96e] text-2xl">0{i + 1}</div>
                    <div className="col-span-8">
                      <div className="font-display text-2xl tracking-tight">{n.role_title}</div>
                      <p className="mt-2 text-[#a8a094] text-sm leading-relaxed">{n.note || "—"}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className={`text-[10px] uppercase tracking-[0.28em] px-3 py-1 border ${
                        n.verdict === "hire" ? "border-[#c9a96e] text-[#c9a96e]" :
                        n.verdict === "pass" ? "border-[#8a5052] text-[#8a5052]" :
                        "border-[#f2ece0]/15 text-[#a8a094]"
                      }`}>
                        {n.verdict || "note"}
                      </span>
                    </div>
                    <div className="col-span-1 text-right overline">{fmt(n.created_at).split(",")[0]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "review" && (
          <div className="mt-14 grid lg:grid-cols-12 gap-10" data-testid="review-panel">
            <div className="lg:col-span-6 border border-[#f2ece0]/[0.08] p-8">
              <div className="overline-gold mb-4">Open a shared rehearsal</div>
              <h2 className="font-display text-3xl tracking-tight">Paste the share token</h2>
              <p className="mt-3 text-sm text-[#a8a094]">
                Candidates who send you a share link (`/share/shr_…`) will look like this.
              </p>
              <div className="mt-8 flex gap-2 items-center">
                <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 bg-transparent border border-[#f2ece0]/[0.15] px-4 py-3 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c9a96e]"
                  placeholder="shr_abc123…"
                  data-testid="share-token-input"
                />
                <button onClick={openShareToken}
                  className="inline-flex items-center gap-2 border border-[#c9a96e] px-6 py-3 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all"
                  data-testid="open-share-btn">
                  Open <ArrowUpRight size={11} />
                </button>
              </div>
            </div>
            <div className="lg:col-span-6 border border-[#f2ece0]/[0.08] p-8">
              <div className="overline-gold mb-4">Directives</div>
              <ol className="space-y-4 text-sm text-[#a8a094]">
                <li><span className="font-display italic text-[#c9a96e] text-lg mr-2">I</span> Candidate shares a report from their Salon → they get a `shr_…` token.</li>
                <li><span className="font-display italic text-[#c9a96e] text-lg mr-2">II</span> Paste it above → you'll land on the public dossier.</li>
                <li><span className="font-display italic text-[#c9a96e] text-lg mr-2">III</span> Add a private verdict + note. It appears in your inbox above.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
