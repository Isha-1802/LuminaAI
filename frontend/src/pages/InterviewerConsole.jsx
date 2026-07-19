import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import MonetizationCard from "@/components/MonetizationCard";
import { ArrowUpRight, Users, CheckCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function InterviewerConsole() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (user && user.role !== "interviewer") nav("/dashboard", { replace: true });
  }, [user, nav]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const [bRes, pRes] = await Promise.all([
          api.get("/bookings/"),
          api.get("/profiles/me")
        ]);
        setBookings(bRes.data);
        setMyProfile(pRes.data);
      } catch (err) {
        toast.error("Failed to load data");
      } finally {
        setBusy(false);
      }
    };
    fetchBookings();
  }, []);

  const completed = bookings.filter(b => b.status === "completed");
  const upcoming = bookings.filter(b => b.status === "scheduled");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]" data-testid="console-page">
      <Navbar />
      <AmbientBackground />
      <div className="pt-[112px] max-w-[1200px] mx-auto px-6 md:px-12 pb-24">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="border-b border-[#f2ece0]/[0.08] pb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="overline-gold">§ Interviewer Console</div>
            <div className="overline">Vol I · {user?.name}</div>
          </div>
          <div className="flex items-end justify-between flex-wrap gap-8">
            <h1 className="font-display text-[52px] md:text-[72px] leading-[0.94] tracking-[-0.03em]" data-testid="console-title">
              Candidate <span className="font-display-italic text-shimmer">Roster</span>.
            </h1>
            <div className="flex gap-4">
              <div className="text-right">
                <div className="font-display text-4xl text-[#c68b73]">{completed.length}</div>
                <div className="overline">Interviews Completed</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-14 grid lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-8 space-y-12">
            
            {/* Upcoming (if any) */}
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <Calendar className="text-[#c68b73]" size={20} />
                  <h2 className="font-display text-3xl tracking-tight">Upcoming Sessions</h2>
                </div>
                <div className="border border-[#c68b73]/20 divide-y divide-[#c68b73]/20 bg-[#c68b73]/5">
                  {upcoming.map(b => (
                    <div key={b.booking_id} className="p-6 flex items-center justify-between">
                      <div>
                        <div className="font-display text-2xl tracking-tight text-[#f2ece0]">{b.candidate_name}</div>
                        <div className="text-sm text-[#a8a094] mt-1">{new Date(b.start_time).toLocaleString()}</div>
                      </div>
                      <Link to={`/booking/${b.booking_id}`} className="inline-flex items-center gap-2 border border-[#c68b73] px-4 py-2 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all text-[#c68b73]">
                        Open Details <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Candidates */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Users className="text-[#f2ece0]" size={20} />
                <h2 className="font-display text-3xl tracking-tight">Past Candidates</h2>
              </div>
              
              {completed.length === 0 ? (
                <div className="border border-dashed border-[#f2ece0]/[0.15] py-20 text-center">
                  <div className="font-display italic text-5xl text-[#c68b73]/50 mb-3">"</div>
                  <p className="text-[#a8a094] max-w-md mx-auto">
                    You haven't completed any interviews yet. Once you finish a session, the candidate will appear here.
                  </p>
                </div>
              ) : (
                <div className="border border-[#f2ece0]/[0.08] divide-y divide-[#f2ece0]/[0.06]">
                  {completed.map((b) => (
                    <div key={b.booking_id} className="p-6 flex items-center justify-between hover:bg-[#f2ece0]/[0.02] transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-display text-2xl tracking-tight text-[#f2ece0]">{b.candidate_name}</span>
                          <span className="flex items-center gap-1 text-[10px] uppercase text-[#c68b73] border border-[#c68b73]/40 px-2 py-0.5"><CheckCircle size={10} /> Completed</span>
                        </div>
                        <div className="text-sm text-[#a8a094] mt-2">
                          Concluded on {new Date(b.updated_at || b.start_time).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <Link to={`/booking/${b.booking_id}`} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#a8a094] hover:text-[#f2ece0] transition-colors">
                          View Log <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>

          <div className="lg:col-span-4 space-y-6">
            <MonetizationCard interviewer={myProfile} />
            <div className="border border-[#f2ece0]/[0.08] p-8 bg-[#f2ece0]/[0.02]">
              <div className="overline-gold mb-4">Interviewer Guidelines</div>
              <ul className="space-y-4 text-sm text-[#a8a094]">
                <li><span className="text-[#c68b73] font-bold">1.</span> Join the meeting 5 minutes early to prepare.</li>
                <li><span className="text-[#c68b73] font-bold">2.</span> Keep all communication professional and within the platform's chat.</li>
                <li><span className="text-[#c68b73] font-bold">3.</span> Once an interview is finished, ensure you click "Mark as Completed" on the booking page.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
