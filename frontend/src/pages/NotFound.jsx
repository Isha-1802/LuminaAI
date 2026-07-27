import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuroraField } from "@/components/Parallax";

export default function NotFound() {
  const { user } = useAuth();
  const homePath = user ? (user.role === "interviewer" ? "/console" : "/dashboard") : "/";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen text-[#f2ece0] flex items-center justify-center px-6"
      data-testid="not-found-page"
    >
      <AuroraField variant="default" />
      <div className="relative z-10 text-center max-w-lg">
        <div className="overline-gold mb-6">§ Lost Correspondence</div>
        <div className="font-display text-[120px] md:text-[180px] leading-none tracking-[-0.04em] text-shimmer">
          404
        </div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-4">
          This page never made it <span className="font-display-italic">to print.</span>
        </h1>
        <p className="mt-5 text-[#a8a094] leading-relaxed">
          The address you followed doesn't exist in this volume. No harm done — let's get you back to the atelier.
        </p>
        <Link
          to={homePath}
          className="mt-10 inline-flex items-center gap-3 border border-[#c68b73] text-[#f2ece0] px-8 py-4 text-[11px] uppercase tracking-[0.32em] hover:bg-[#c68b73] hover:text-[#0c0a09] transition-all duration-500"
          data-testid="not-found-home-btn"
        >
          <ArrowLeft size={14} /> {user ? "Back to your dashboard" : "Back to Lumina"}
        </Link>
      </div>
    </motion.div>
  );
}
