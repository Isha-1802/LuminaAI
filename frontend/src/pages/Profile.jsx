import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, mediaUrl } from "@/lib/api";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import MonetizationCard from "@/components/MonetizationCard";
import CandidateProfileEditor from "@/components/CandidateProfileEditor";
import CandidateProgressChart from "@/components/CandidateProgressChart";
import { AuroraField } from "@/components/Parallax";
import DevQuote from "@/components/DevQuote";
import { Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";

const PROFILE_BG = "https://images.unsplash.com/photo-1510519138101-570d1dca3d66?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHxkYXJrJTIwY2luZW1hdGljJTIwb2ZmaWNlJTIwbGlnaHRpbmd8ZW58MHx8fHwxNzgzMTg0OTI3fDA&ixlib=rb-4.1.0&q=85";

// Interviewer profile glass card + input styles (match the candidate editor)
const IGLASS = "p-8 md:p-10 rounded-2xl bg-[#f2ece0]/[0.05] backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.5)]";
const IINPUT = "mt-2 w-full bg-[#0c0a09]/60 border border-[#f2ece0]/[0.1] rounded-xl px-4 py-3 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c68b73] transition-colors";

function ProfileBackdrop() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-cover bg-center opacity-[0.14] bg-drift" style={{ backgroundImage: `url(${PROFILE_BG})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a09]/70 via-[#0c0a09]/90 to-[#0c0a09]" />
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  
  const [myProfile, setMyProfile] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [form, setForm] = useState({
    name: "",
    headline: "",
    about: "",
    current_company: "",
    years_of_experience: "",
    skills: "",
    linkedin_url: "",
    is_available: false,
    available_slots: [],
  });
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("09:00");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        headline: user.headline || "",
        about: user.about || "",
        current_company: user.current_company || "",
        years_of_experience: user.years_of_experience ?? "",
        skills: user.skills ? user.skills.join(", ") : "",
        linkedin_url: user.linkedin_url || "",
        is_available: user.is_available || false,
        available_slots: user.available_slots || [],
      });
      // Fetch full profile for monetization card
      api.get("/profiles/me").then(r => setMyProfile(r.data)).catch(() => {});
    }
  }, [user]);

  const addSlot = () => {
    if (!newSlotDate || !newSlotTime) return;
    const slotString = `${newSlotDate}T${newSlotTime}:00.000Z`;
    if (!form.available_slots.includes(slotString)) {
      setForm({ ...form, available_slots: [...form.available_slots, slotString].sort() });
    }
  };

  const removeSlot = (slotToRemove) => {
    setForm({ ...form, available_slots: form.available_slots.filter(s => s !== slotToRemove) });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name || null,
        headline: form.headline || null,
        about: form.about || null,
        current_company: form.current_company || null,
        years_of_experience: form.years_of_experience ? parseInt(form.years_of_experience) : null,
        skills: form.skills ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : null,
        linkedin_url: form.linkedin_url || null,
        is_available: form.is_available,
        available_slots: form.available_slots,
      };
      
      const { data } = await api.put("/profiles/me", payload);
      setUser(data);
      setMyProfile(data);
      toast.success("Profile updated successfully");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const errorMsg = Array.isArray(detail) ? detail[0]?.msg : (detail || "Failed to update profile");
      toast.error(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/profiles/me/picture", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUser(data);
      setMyProfile(data);
      toast.success("Profile picture updated!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to upload picture");
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user) return null;

  const isInterviewer = user.role === "interviewer";

  if (!isInterviewer) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]">
        <Navbar />
        <AuroraField variant="ember" />
        <div className="pt-[112px] max-w-[900px] mx-auto px-6 md:px-12 pb-24 relative z-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="overline-gold mb-4">§ Settings</div>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-10">Your Profile</h1>
            <CandidateProfileEditor
              user={myProfile || user}
              onSaved={(data) => { setUser(data); setMyProfile(data); }}
            />
            <CandidateProgressChart />
            <DevQuote />
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]">
      <Navbar />
      <AuroraField variant="ember" />
      <div className="pt-[112px] max-w-[800px] mx-auto px-6 md:px-12 pb-24 relative z-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="overline-gold mb-4">§ Settings</div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-10">Your Profile</h1>

          <form onSubmit={onSubmit} className="space-y-10">
            {/* Identity */}
            <div className={IGLASS}>
              <div className="overline-gold mb-2">§ Identity — 01</div>
              <h2 className="font-display text-3xl tracking-tight mb-8">Who candidates will meet</h2>
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-[#1a1714] border border-[#c68b73]/30 flex items-center justify-center shrink-0">
                  {user.picture ? (
                    <img src={mediaUrl(user.picture)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#c68b73] font-display text-3xl">{user.name?.charAt(0) || user.email?.charAt(0)}</span>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePictureUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPic} className="text-[10px] uppercase tracking-[0.28em] border border-[#f2ece0]/20 px-4 py-2.5 hover:border-[#c68b73] hover:text-[#c68b73] transition-colors">
                  {uploadingPic ? "Uploading…" : "Change picture"}
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="overline">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={IINPUT} placeholder="e.g. Grace Hopper" />
                </div>
                <div>
                  <label className="overline">Headline</label>
                  <input type="text" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className={IINPUT} placeholder="e.g. Staff Engineer at Stripe · 10y interviewing" />
                </div>
                <div>
                  <label className="overline">About</label>
                  <textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={4} className={`${IINPUT} resize-none`} placeholder="Your background, what rounds you run best, and how you coach candidates…" />
                </div>
              </div>
            </div>

            {/* Expertise */}
            <div className={IGLASS}>
              <div className="overline-gold mb-2">§ Expertise — 02</div>
              <h2 className="font-display text-3xl tracking-tight mb-8">Your credentials</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="overline">Current company</label>
                  <input type="text" value={form.current_company} onChange={(e) => setForm({ ...form, current_company: e.target.value })} className={IINPUT} placeholder="e.g. Google" />
                </div>
                <div>
                  <label className="overline">Years of experience</label>
                  <input type="number" value={form.years_of_experience} onChange={(e) => setForm({ ...form, years_of_experience: e.target.value })} className={IINPUT} placeholder="e.g. 8" />
                </div>
              </div>
              <div className="mt-6">
                <label className="overline">Skills you interview for (comma separated)</label>
                <input type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className={IINPUT} placeholder="System Design, React, Distributed Systems…" />
                {form.skills?.trim() && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.skills.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                      <span key={s} className="rounded-full border border-[#c68b73]/30 bg-[#c68b73]/[0.08] px-3 py-1.5 text-xs text-[#f2ece0]">{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6">
                <label className="overline">LinkedIn URL</label>
                <input type="url" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className={IINPUT} placeholder="https://linkedin.com/in/…" />
              </div>
            </div>

            {/* Availability & earnings */}
            <div className={IGLASS}>
              <div className="overline-gold mb-2">§ Availability & Earnings — 03</div>
              <h2 className="font-display text-3xl tracking-tight mb-8">Open your calendar</h2>

              <div className="flex items-center justify-between rounded-xl bg-[#c68b73]/[0.06] border border-[#c68b73]/25 px-5 py-4">
                <div>
                  <div className="font-medium text-[#f2ece0]">Available for interviews</div>
                  <div className="text-sm text-[#a8a094] mt-0.5">Must be ON to appear in candidate search.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
                  <div className="w-11 h-6 bg-[#f2ece0]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c68b73]"></div>
                </label>
              </div>

              <div className="mt-6">
                <MonetizationCard interviewer={myProfile} />
              </div>

              <div className="mt-8">
                <div className="overline mb-4">Availability slots (UTC)</div>
                <div className="flex flex-wrap gap-3 mb-4">
                  <input type="date" value={newSlotDate} onChange={(e) => setNewSlotDate(e.target.value)} className="bg-[#0c0a09]/60 border border-[#f2ece0]/[0.12] rounded-xl px-4 py-2.5 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c68b73]" />
                  <input type="time" value={newSlotTime} step="3600" onChange={(e) => setNewSlotTime(e.target.value)} className="bg-[#0c0a09]/60 border border-[#f2ece0]/[0.12] rounded-xl px-4 py-2.5 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c68b73]" />
                  <button type="button" onClick={addSlot} className="border border-[#c68b73] rounded-xl px-5 text-[10px] uppercase tracking-[0.28em] text-[#c68b73] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-colors">Add slot</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.available_slots.map((slot) => (
                    <div key={slot} className="flex items-center gap-2 rounded-full border border-[#f2ece0]/[0.12] bg-[#f2ece0]/[0.04] px-3.5 py-1.5 text-sm">
                      <span>{new Date(slot).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
                      <button type="button" onClick={() => removeSlot(slot)} className="text-[#6b6459] hover:text-[#8a5052]">&times;</button>
                    </div>
                  ))}
                  {form.available_slots.length === 0 && (
                    <span className="text-sm text-[#a8a094]">No slots yet — candidates can't book you until you add one.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 border border-[#c68b73] text-[#f2ece0] px-8 py-4 text-[11px] uppercase tracking-[0.32em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all disabled:opacity-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Profile
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
