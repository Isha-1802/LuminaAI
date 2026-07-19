import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
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

          <form onSubmit={onSubmit} className="space-y-8 border border-[#f2ece0]/[0.08] p-8">
            {/* Basic Info */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-2xl">Basic Info</h2>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1a1714] border border-[#c68b73]/30 flex items-center justify-center">
                    {user.picture ? (
                      <img src={user.picture.startsWith("http") ? user.picture : `${import.meta.env.VITE_API_URL || "http://localhost:8000"}${user.picture}`} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#c68b73] font-display text-2xl">{user.name?.charAt(0) || user.email?.charAt(0)}</span>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePictureUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPic} className="text-sm border border-[#f2ece0]/20 px-3 py-1.5 hover:bg-[#f2ece0]/10 transition-colors">
                    {uploadingPic ? "Uploading..." : "Change Picture"}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="overline">Name</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="mt-2 w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-2 text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                  placeholder="e.g. Jane Doe"
                />
              </div>

              <div>
                <label className="overline">Headline</label>
                <input 
                  type="text" 
                  value={form.headline} 
                  onChange={(e) => setForm({...form, headline: e.target.value})}
                  className="mt-2 w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-2 text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                  placeholder="e.g. Senior Software Engineer at Stripe"
                />
              </div>
              
              <div>
                <label className="overline">About</label>
                <textarea 
                  value={form.about} 
                  onChange={(e) => setForm({...form, about: e.target.value})}
                  className="mt-2 w-full bg-transparent border border-[#f2ece0]/[0.15] p-3 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                  placeholder="Tell us about your background and what you are looking for..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="overline">Current Company</label>
                  <input 
                    type="text" 
                    value={form.current_company} 
                    onChange={(e) => setForm({...form, current_company: e.target.value})}
                    className="mt-2 w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-2 text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                    placeholder="e.g. Google"
                  />
                </div>
                <div>
                  <label className="overline">Years of Experience</label>
                  <input 
                    type="number" 
                    value={form.years_of_experience} 
                    onChange={(e) => setForm({...form, years_of_experience: e.target.value})}
                    className="mt-2 w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-2 text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              <div>
                <label className="overline">Skills (Comma separated)</label>
                <input 
                  type="text" 
                  value={form.skills} 
                  onChange={(e) => setForm({...form, skills: e.target.value})}
                  className="mt-2 w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-2 text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                  placeholder="React, Node.js, System Design..."
                />
              </div>

              <div>
                <label className="overline">LinkedIn URL</label>
                <input 
                  type="url" 
                  value={form.linkedin_url} 
                  onChange={(e) => setForm({...form, linkedin_url: e.target.value})}
                  className="mt-2 w-full bg-transparent border-b border-[#f2ece0]/[0.15] pb-2 text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            {/* Interviewer Specific */}
            {isInterviewer && (
              <div className="space-y-6 pt-8 border-t border-[#f2ece0]/[0.08]">
                <h2 className="font-display text-2xl text-[#c68b73]">Interviewer Settings</h2>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#f2ece0]">Available for Interviews</div>
                    <div className="text-sm text-[#c68b73]">Must be turned ON to appear in candidate search results!</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={form.is_available} 
                      onChange={(e) => setForm({...form, is_available: e.target.checked})} 
                    />
                    <div className="w-11 h-6 bg-[#f2ece0]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c68b73]"></div>
                  </label>
                </div>

                {/* Monetization Status — read only, auto-computed by platform */}
                <MonetizationCard interviewer={myProfile} />

                <div className="pt-4">
                  <h3 className="font-medium text-[#f2ece0] mb-4">Availability Slots (UTC)</h3>
                  <div className="flex gap-4 mb-4">
                    <input 
                      type="date" 
                      value={newSlotDate}
                      onChange={(e) => setNewSlotDate(e.target.value)}
                      className="bg-transparent border border-[#f2ece0]/[0.15] p-2 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                    />
                    <input 
                      type="time" 
                      value={newSlotTime}
                      step="3600"
                      onChange={(e) => setNewSlotTime(e.target.value)}
                      className="bg-transparent border border-[#f2ece0]/[0.15] p-2 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                    />
                    <button type="button" onClick={addSlot} className="border border-[#c68b73] px-4 hover:bg-[#c68b73] hover:text-[#0c0a09] transition-colors text-sm">
                      Add Slot
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {form.available_slots.map(slot => (
                      <div key={slot} className="flex items-center gap-2 border border-[#f2ece0]/20 px-3 py-1 text-sm bg-[#f2ece0]/5">
                        <span>{new Date(slot).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                        <button type="button" onClick={() => removeSlot(slot)} className="text-[#f2ece0]/60 hover:text-red-400">&times;</button>
                      </div>
                    ))}
                    {form.available_slots.length === 0 && (
                      <span className="text-sm text-[#a8a094]">No slots added yet. Candidates cannot book you.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-8 flex justify-end">
              <button 
                type="submit" 
                disabled={busy}
                className="inline-flex items-center gap-2 border border-[#c68b73] text-[#f2ece0] px-8 py-4 text-[11px] uppercase tracking-[0.32em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all"
              >
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
