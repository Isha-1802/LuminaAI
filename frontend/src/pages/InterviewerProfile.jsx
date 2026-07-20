import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, mediaUrl } from "@/lib/api";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import { MapPin, Clock, Loader2, Calendar, Star } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function InterviewerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interviewer, setInterviewer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [busy, setBusy] = useState(true);
  const [bookingBusy, setBookingBusy] = useState(false);

  useEffect(() => {
    const fetchInterviewer = async () => {
      try {
        const [profRes, revRes] = await Promise.all([
          api.get(`/profiles/interviewers/${id}`),
          api.get(`/reviews/interviewer/${id}`)
        ]);
        setInterviewer(profRes.data);
        setReviews(revRes.data);
      } catch (err) {
        toast.error("Failed to load interviewer profile");
        navigate("/experts");
      } finally {
        setBusy(false);
      }
    };
    fetchInterviewer();
  }, [id, navigate]);

  const handleBook = async (slot) => {
    setBookingBusy(true);
    try {
      await api.post("/bookings/", {
        interviewer_id: id,
        start_time: slot,
        end_time: new Date(new Date(slot).getTime() + 60 * 60 * 1000).toISOString() // 1 hour later
      });
      toast.success("Interview successfully booked!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to book slot");
      // Refresh profile to get latest slots
      const res = await api.get(`/profiles/interviewers/${id}`);
      setInterviewer(res.data);
    } finally {
      setBookingBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#c68b73]" size={32} />
      </div>
    );
  }

  if (!interviewer) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0]">
      <Navbar />
      <AmbientBackground variant="warm" />

      <div className="pt-[112px] max-w-[1000px] mx-auto px-6 md:px-12 pb-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="flex flex-col md:flex-row gap-12">
            
            {/* Profile Info */}
            <div className="flex-1 space-y-6">
              <div className="overline-gold mb-2">§ Expert Profile</div>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-[#1a1714] border border-[#c68b73]/30 flex-shrink-0 flex items-center justify-center">
                  {interviewer.picture ? (
                    <img src={mediaUrl(interviewer.picture)} alt={interviewer.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#c68b73] font-display text-4xl">{interviewer.name?.charAt(0) || interviewer.email?.charAt(0) || "?"}</span>
                  )}
                </div>
                <div>
                  <h1 className="font-display text-4xl md:text-5xl tracking-tight">{interviewer.name}</h1>
                  <div className="text-xl text-[#c68b73] mt-2">{interviewer.headline || "Industry Expert"}</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-[#a8a094]">
                {interviewer.current_company && (
                  <div className="flex items-center gap-1"><MapPin size={14} /> {interviewer.current_company}</div>
                )}
                {interviewer.years_of_experience && (
                  <div className="flex items-center gap-1"><Clock size={14} /> {interviewer.years_of_experience}+ years</div>
                )}
                {/* Platform-assigned rate based on monetization tier */}
                {interviewer.is_monetized ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[#c68b73] font-medium border border-[#c68b73]/40 px-2 py-0.5">
                      ₹{(interviewer.platform_rate_inr || 0).toLocaleString("en-IN")}/session
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[#a8a094] border border-[#f2ece0]/10 px-2 py-0.5">
                      {interviewer.monetization_tier || "Bronze"}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] uppercase tracking-wider text-[#a8a094] border border-[#f2ece0]/10 px-2 py-0.5">
                    🔨 Building Reputation · Free
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-[#f2ece0]/[0.08]">
                <h3 className="font-display text-2xl mb-4">About</h3>
                <p className="text-[#a8a094] leading-relaxed whitespace-pre-wrap">
                  {interviewer.about || "No biography provided."}
                </p>
              </div>

              <div className="pt-6 border-t border-[#f2ece0]/[0.08]">
                <h3 className="font-display text-2xl mb-4">Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {(interviewer.skills || []).map(skill => (
                    <span key={skill} className="text-[11px] uppercase tracking-wider bg-[#f2ece0]/5 border border-[#f2ece0]/10 text-[#f2ece0] px-3 py-1.5">
                      {skill}
                    </span>
                  ))}
                  {(!interviewer.skills || interviewer.skills.length === 0) && (
                    <span className="text-[#a8a094] text-sm">Not specified</span>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="pt-6 border-t border-[#f2ece0]/[0.08]">
                <h3 className="font-display text-2xl mb-6">Reviews</h3>
                
                {reviews.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            size={18}
                            className={star <= Math.round(interviewer.avg_rating || 0) ? "fill-[#c68b73] text-[#c68b73]" : "text-[#3a3530]"}
                          />
                        ))}
                      </div>
                      <span className="font-display text-2xl text-[#c68b73]">{(interviewer.avg_rating || 0).toFixed(1)}</span>
                      <span className="text-sm text-[#a8a094]">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                    </div>
                    
                    <div className="space-y-4">
                      {reviews.map(r => (
                        <div key={r.review_id} className="border border-[#f2ece0]/[0.08] p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-medium text-[#f2ece0] text-sm">{r.candidate_name}</div>
                              <div className="flex gap-0.5 mt-1">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} size={12} className={s <= r.rating ? "fill-[#c68b73] text-[#c68b73]" : "text-[#3a3530]"} />
                                ))}
                              </div>
                            </div>
                            <div className="text-[10px] text-[#6b6459]">{new Date(r.created_at).toLocaleDateString()}</div>
                          </div>
                          {r.comment && <p className="text-sm text-[#a8a094] leading-relaxed">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[#a8a094] italic border border-dashed border-[#f2ece0]/10 py-8 text-center">
                    No reviews yet.
                  </div>
                )}
              </div>
            </div>

            {/* Booking Panel */}
            <div className="w-full md:w-[380px]">
              <div className="border border-[#f2ece0]/[0.15] bg-[#f2ece0]/[0.02] p-8 sticky top-[112px]">
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="text-[#c68b73]" size={20} />
                  <h3 className="font-display text-xl">Available Sessions</h3>
                </div>
                
                <p className="text-sm text-[#a8a094] mb-6">
                  Select an open 1-hour slot below to immediately reserve your interview session.
                </p>

                <div className="space-y-3">
                  {(interviewer.available_slots || []).map(slot => (
                    <button
                      key={slot}
                      onClick={() => handleBook(slot)}
                      disabled={bookingBusy}
                      className="w-full flex items-center justify-between border border-[#f2ece0]/20 p-4 hover:border-[#c68b73] hover:bg-[#c68b73]/5 transition-all text-left disabled:opacity-50"
                    >
                      <div>
                        <div className="font-medium text-[#f2ece0]">
                          {new Date(slot).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-sm text-[#a8a094]">
                          {new Date(slot).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-[#c68b73] font-bold">
                        Book
                      </div>
                    </button>
                  ))}

                  {(!interviewer.available_slots || interviewer.available_slots.length === 0) && (
                    <div className="text-center py-8 text-sm text-[#a8a094] italic border border-dashed border-[#f2ece0]/20">
                      No available slots right now.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
