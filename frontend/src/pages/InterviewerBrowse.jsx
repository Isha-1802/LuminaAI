import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import TiltCard from "@/components/TiltCard";
import { Search, MapPin, Star, Clock, Filter, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function InterviewerBrowse() {
  const [interviewers, setInterviewers] = useState([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  
  useEffect(() => {
    const fetchInterviewers = async () => {
      try {
        setBusy(true);
        // Only fetch available interviewers
        const res = await api.get(`/profiles/interviewers?q=${search}`);
        setInterviewers(res.data);
      } catch (err) {
        console.error("Failed to load interviewers", err);
      } finally {
        setBusy(false);
      }
    };
    
    // Simple debounce
    const timeout = setTimeout(fetchInterviewers, 500);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]">
      <Navbar />
      <AmbientBackground variant="warm" />

      <div className="pt-[112px] max-w-[1200px] mx-auto px-6 md:px-12 pb-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <div className="overline-gold mb-4">§ Expert Directory</div>
              <h1 className="font-display text-4xl md:text-5xl tracking-tight">Find an Interviewer</h1>
              <p className="text-[#a8a094] mt-4 max-w-xl">
                Browse our curated list of industry experts. Book a session to get real, actionable feedback.
              </p>
            </div>
            
            <div className="w-full md:w-72 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6459]" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, role, company..."
                className="w-full bg-transparent border border-[#f2ece0]/[0.15] pl-12 pr-4 py-3 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
              />
            </div>
          </div>

          {busy ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="animate-spin text-[#c68b73]" size={32} />
            </div>
          ) : interviewers.length === 0 ? (
            <div className="border border-dashed border-[#f2ece0]/[0.15] py-20 text-center">
              <p className="text-[#a8a094]">No available interviewers found matching your search.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interviewers.map(i => (
                <TiltCard key={i.user_id} className="border border-[#f2ece0]/[0.08] p-6 flex flex-col hover:border-[#c68b73]/40 transition-colors overflow-hidden">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1a1714] border border-[#c68b73]/30 flex-shrink-0 flex items-center justify-center">
                        {i.picture ? (
                          <img src={i.picture.startsWith("http") ? i.picture : `${import.meta.env.VITE_API_URL || "http://localhost:8000"}${i.picture}`} alt={i.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[#c68b73] font-display text-lg">{i.name?.charAt(0) || i.email?.charAt(0) || "?"}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-display text-xl text-[#f2ece0]">{i.name}</h3>
                        <div className="text-sm text-[#c68b73] mt-1">{i.headline || "Industry Expert"}</div>
                        {i.avg_rating > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={11} className={s <= Math.round(i.avg_rating) ? "fill-[#c68b73] text-[#c68b73]" : "text-[#3a3530]"} />
                              ))}
                            </div>
                            <span className="text-[11px] text-[#a8a094]">{i.avg_rating.toFixed(1)} ({i.review_count})</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {i.is_monetized ? (
                      <div className="text-sm font-medium border border-[#c68b73]/40 text-[#c68b73] px-2 py-1">
                        ₹{(i.platform_rate_inr || 0).toLocaleString("en-IN")}
                      </div>
                    ) : (
                      <div className="text-[10px] uppercase tracking-wider text-[#a8a094] border border-[#f2ece0]/10 px-2 py-1">
                        Free
                      </div>
                    )}
                  </div>
                  
                  {i.current_company && (
                    <div className="flex items-center gap-2 text-sm text-[#a8a094] mb-2">
                      <MapPin size={12} /> {i.current_company}
                    </div>
                  )}
                  
                  {i.years_of_experience && (
                    <div className="flex items-center gap-2 text-sm text-[#a8a094] mb-4">
                      <Clock size={12} /> {i.years_of_experience}+ years experience
                    </div>
                  )}
                  
                  <p className="text-sm text-[#a8a094] line-clamp-3 mb-6 flex-1">
                    {i.about || "This expert has not provided a biography yet."}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(i.skills || []).slice(0, 3).map(skill => (
                      <span key={skill} className="text-[10px] uppercase tracking-wider bg-[#f2ece0]/5 text-[#f2ece0] px-2 py-1">
                        {skill}
                      </span>
                    ))}
                    {(i.skills?.length > 3) && (
                      <span className="text-[10px] uppercase tracking-wider text-[#6b6459] px-2 py-1">
                        +{i.skills.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <Link to={`/interviewer/${i.user_id}`} className="block w-full text-center border border-[#f2ece0]/20 py-3 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] hover:border-[#c68b73] transition-all">
                    View Profile & Book
                  </Link>
                </TiltCard>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
