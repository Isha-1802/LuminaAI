import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import AmbientBackground from "@/components/AmbientBackground";
import ReviewModal from "@/components/ReviewModal";
import { Loader2, Send, Video, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BookingDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  
  const messagesEndRef = useRef(null);

  const fetchDetails = async () => {
    try {
      const b = await api.get(`/bookings/${id}`);
      setBooking(b.data);
      const m = await api.get(`/chat/${id}`);
      setMessages(m.data);
      // Check if candidate has already reviewed
      if (user.role === "candidate") {
        const r = await api.get(`/reviews/check/${id}`);
        setAlreadyReviewed(r.data.reviewed);
      }
    } catch (err) {
      toast.error("Booking not found or unauthorized");
      navigate("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      api.get(`/chat/${id}`).then(res => setMessages(res.data)).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [id, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const content = newMessage;
    setNewMessage(""); // Optimistic clear
    
    try {
      await api.post(`/chat/${id}`, { content });
      await fetchDetails();
    } catch (err) {
      toast.error("Failed to send message");
    }
  };
  
  const handleComplete = async () => {
    try {
      await api.put(`/bookings/${id}/complete`);
      toast.success("Interview marked as completed");
      await fetchDetails();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Error completing session");
    }
  };

  if (busy || !booking) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#c68b73]" size={32} />
      </div>
    );
  }

  const isInterviewer = user.role === "interviewer";
  const otherName = isInterviewer ? booking.candidate_name : booking.interviewer_name;
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen bg-[#0c0a09] text-[#f2ece0] flex flex-col">
      <Navbar />
      <AmbientBackground variant="quiet" />

      <div className="pt-[112px] max-w-[1200px] mx-auto px-6 md:px-12 pb-12 flex-1 flex flex-col w-full">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#f2ece0]/[0.08] pb-8">
            <div>
              <div className="overline-gold mb-2">§ Booking Session</div>
              <h1 className="font-display text-4xl tracking-tight">Interview with {otherName}</h1>
              <div className="flex items-center gap-4 text-sm text-[#a8a094] mt-3">
                <div className="flex items-center gap-1"><Clock size={14} /> {new Date(booking.start_time).toLocaleString()}</div>
                <div className="uppercase tracking-wider text-[10px] border border-[#c68b73]/40 text-[#c68b73] px-2 py-0.5 rounded-sm">
                  {booking.status}
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              {booking.meet_link && booking.status !== 'cancelled' && (
                <a 
                  href={booking.meet_link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 bg-[#c68b73] text-[#0c0a09] px-6 py-3 text-[11px] uppercase tracking-[0.28em] font-medium hover:bg-[#b0935d] transition-all"
                >
                  <Video size={14} /> Join Video Call
                </a>
              )}
            </div>
          </div>
          
          {/* Main Layout */}
          <div className="flex-1 grid lg:grid-cols-3 gap-8 min-h-[500px]">
            
            {/* Chat Section */}
            <div className="lg:col-span-2 border border-[#f2ece0]/[0.08] flex flex-col bg-[#f2ece0]/[0.01]">
              <div className="border-b border-[#f2ece0]/[0.08] p-4 bg-[#f2ece0]/[0.02]">
                <h3 className="font-display text-xl">Messaging</h3>
                <p className="text-xs text-[#a8a094] mt-1">Communicate with your {isInterviewer ? "candidate" : "interviewer"} directly.</p>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[500px]">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-[#a8a094] italic border border-dashed border-[#f2ece0]/10">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user.user_id;
                    return (
                      <div key={msg.message_id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase text-[#6b6459]">{msg.sender_name}</span>
                          <span className="text-[9px] text-[#6b6459]">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className={`px-4 py-2 text-sm max-w-[80%] ${isMe ? "bg-[#c68b73] text-[#0c0a09]" : "bg-[#f2ece0]/10 text-[#f2ece0]"}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <form onSubmit={sendMessage} className="border-t border-[#f2ece0]/[0.08] p-4 flex gap-2 bg-[#0c0a09]">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border border-[#f2ece0]/20 px-4 py-2 text-sm text-[#f2ece0] focus:outline-none focus:border-[#c68b73]"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="border border-[#c68b73] text-[#c68b73] px-4 py-2 hover:bg-[#c68b73] hover:text-[#0c0a09] transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
            
            {/* Context Section */}
            <div className="lg:col-span-1 space-y-6">
              <div className="border border-[#f2ece0]/[0.08] p-6 bg-[#f2ece0]/[0.02]">
                <h3 className="font-display text-xl mb-4">Guidelines</h3>
                <ul className="space-y-3 text-sm text-[#a8a094]">
                  <li className="flex gap-2"><span className="text-[#c68b73]">01</span> Be on time for the interview.</li>
                  <li className="flex gap-2"><span className="text-[#c68b73]">02</span> Test your camera and microphone beforehand.</li>
                  <li className="flex gap-2"><span className="text-[#c68b73]">03</span> Share resumes or links securely via the chat.</li>
                </ul>
              </div>
              
              {isInterviewer && booking.status !== "completed" && (
                <div className="border border-[#c68b73]/20 p-6 bg-[#c68b73]/5">
                  <h3 className="font-display text-xl mb-4 text-[#c68b73]">Interviewer Actions</h3>
                  <button onClick={handleComplete} className="w-full text-center border border-[#c68b73] py-3 text-[10px] uppercase tracking-[0.28em] text-[#c68b73] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all">
                    Mark as Completed
                  </button>
                </div>
              )}
              {booking.status === "completed" && (
                <div className="border border-[#f2ece0]/20 p-6 bg-[#f2ece0]/5 text-center text-sm text-[#a8a094]">
                  This session has concluded.
                </div>
              )}
            </div>
            
          </div>

          {/* Review Prompt for Candidates */}
          {!isInterviewer && booking.status === "completed" && !alreadyReviewed && (
            <div className="mt-6 border border-[#c68b73]/20 p-6 bg-[#c68b73]/5 text-center">
              <p className="text-sm text-[#a8a094] mb-4">How was your interview? Help other candidates by leaving a review.</p>
              <button
                onClick={() => setShowReview(true)}
                className="border border-[#c68b73] text-[#c68b73] px-6 py-2.5 text-[10px] uppercase tracking-[0.28em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all"
              >
                Leave a Review
              </button>
            </div>
          )}
          {!isInterviewer && booking.status === "completed" && alreadyReviewed && (
            <div className="mt-6 border border-[#f2ece0]/10 p-4 text-center text-sm text-[#6b6459] italic">
              ✓ You have already reviewed this session.
            </div>
          )}
        </motion.div>
      </div>

      {showReview && (
        <ReviewModal
          booking={booking}
          onClose={() => setShowReview(false)}
          onSuccess={() => setAlreadyReviewed(true)}
        />
      )}
    </motion.div>
  );
}
