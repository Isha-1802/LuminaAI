import { useState } from "react";
import { api } from "@/lib/api";
import { Star, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ReviewModal({ booking, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    setBusy(true);
    try {
      await api.post("/reviews/", {
        booking_id: booking.booking_id,
        rating,
        comment: comment.trim() || null
      });
      toast.success("Review submitted. Thank you!");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-[480px] bg-[#111009] border border-[#f2ece0]/15 p-8 z-10"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#6b6459] hover:text-[#f2ece0] transition-colors"
          >
            <X size={16} />
          </button>

          <div className="overline-gold mb-3">§ Session Review</div>
          <h2 className="font-display text-3xl tracking-tight mb-2">
            Rate Your Interviewer
          </h2>
          <p className="text-sm text-[#a8a094] mb-8">
            How was your session with <strong className="text-[#f2ece0]">{booking.interviewer_name}</strong>?
          </p>

          {/* Star Rating */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={`transition-colors ${
                    star <= (hovered || rating)
                      ? "fill-[#c9a96e] text-[#c9a96e]"
                      : "text-[#3a3530]"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-[#c9a96e] font-medium">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </span>
            )}
          </div>

          {/* Comment */}
          <div className="mb-8">
            <label className="overline block mb-2">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience — this helps other candidates choose the right interviewer."
              rows={4}
              maxLength={1000}
              className="w-full bg-transparent border border-[#f2ece0]/15 px-4 py-3 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c9a96e] resize-none"
            />
            <div className="text-right text-[10px] text-[#6b6459] mt-1">{comment.length}/1000</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={busy || rating === 0}
              className="flex-1 flex items-center justify-center gap-2 border border-[#c9a96e] py-3 text-[10px] uppercase tracking-[0.28em] text-[#c9a96e] hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              Submit Review
            </button>
            <button
              onClick={onClose}
              className="px-6 border border-[#f2ece0]/15 text-[10px] uppercase tracking-[0.28em] text-[#a8a094] hover:text-[#f2ece0] hover:border-[#f2ece0]/30 transition-all"
            >
              Skip
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
