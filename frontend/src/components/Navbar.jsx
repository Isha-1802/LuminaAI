import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { mediaUrl } from "@/lib/api";
import { LogOut, LayoutDashboard, Sparkles, User, Menu, X } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const onLanding = location.pathname === "/";
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
  const [menuOpen, setMenuOpen] = useState(false);
  const isCandidate = user && (user.role === "candidate" || user.role === "interviewee");

  // Close the drawer on navigation so it never traps the user
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const go = (path) => { setMenuOpen(false); nav(path); };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#0c0a09]/70 border-b border-[#f2ece0]/[0.06]"
      data-testid="app-navbar"
    >
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-[#c68b73] via-[#e8b8a4] to-[#c68b73]"
        style={{ scaleX: progress }}
        data-testid="scroll-progress-bar"
      />
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-[68px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" data-testid="brand-link">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-[#c68b73]" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#c68b73] blur-md" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display italic text-[22px] tracking-tight text-[#f2ece0]">Lumina</span>
            <span className="overline text-[#c68b73]/70">Nº 01</span>
          </div>
        </Link>



        <div className="flex items-center gap-4">
          {user ? (
            <>
              {(user.role === "candidate" || user.role === "interviewee") && (
                <button
                  onClick={() => nav("/practice")}
                  className="hidden sm:inline-flex items-center gap-2 overline hover:text-[#c68b73] transition-colors"
                  data-testid="nav-practice-btn"
                >
                  <Sparkles size={12} /> Rehearsal Room
                </button>
              )}
              {user.role === "interviewer" ? (
                <button
                  onClick={() => nav("/console")}
                  className="hidden sm:inline-flex items-center gap-2 overline hover:text-[#c68b73] transition-colors"
                  data-testid="nav-console-btn"
                >
                  <LayoutDashboard size={12} /> Interviewer Console
                </button>
              ) : (
                <button
                  onClick={() => nav("/dashboard")}
                  className="hidden sm:inline-flex items-center gap-2 overline hover:text-[#f2ece0] transition-colors"
                  data-testid="nav-dashboard-btn"
                >
                  <LayoutDashboard size={12} /> Dashboard
                </button>
              )}
              <button
                onClick={() => nav("/profile")}
                className="hidden sm:inline-flex items-center gap-2 overline hover:text-[#f2ece0] transition-colors"
                data-testid="nav-profile-btn"
              >
                {user.picture ? (
                  <img 
                    src={mediaUrl(user.picture)}
                    alt="Profile" 
                    className="w-5 h-5 rounded-full object-cover border border-[#c68b73]/30" 
                  />
                ) : (
                  <User size={12} /> 
                )}
                Profile
              </button>
              <NotificationBell />
              <button
                onClick={async () => { await logout(); nav("/"); }}
                className="hidden sm:inline-flex group relative items-center gap-2 px-5 py-2.5 text-[11px] uppercase tracking-[0.28em] text-[#f2ece0] border border-[#f2ece0]/15 hover:border-[#c68b73]/60 transition-all"
                data-testid="nav-logout-btn"
              >
                <LogOut size={11} /> Logout
              </button>
              {/* Mobile menu trigger — without this, phone users can't navigate */}
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="sm:hidden inline-flex items-center justify-center w-10 h-10 border border-[#f2ece0]/15 text-[#f2ece0] hover:border-[#c68b73]/60 transition-colors"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                data-testid="nav-mobile-toggle"
              >
                {menuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </>
          ) : (
            <Link
                to="/auth?mode=login"
                className="group relative inline-flex items-center gap-2 px-6 py-2.5 text-[11px] uppercase tracking-[0.28em] text-[#0c0a09] bg-[#f2ece0] hover:bg-[#c68b73] transition-all"
                data-testid="nav-signup-btn"
              >
                Login / Sign Up
              </Link>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && user && (
          <motion.nav
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="sm:hidden overflow-hidden border-t border-[#f2ece0]/[0.08] bg-[#0c0a09]/95 backdrop-blur-xl"
            data-testid="nav-mobile-menu"
          >
            <div className="px-6 py-4 flex flex-col">
              {isCandidate && (
                <button onClick={() => go("/practice")} className="flex items-center gap-3 py-3.5 text-[11px] uppercase tracking-[0.28em] text-[#f2ece0] hover:text-[#c68b73] transition-colors" data-testid="m-nav-practice">
                  <Sparkles size={14} /> Rehearsal Room
                </button>
              )}
              <button
                onClick={() => go(user.role === "interviewer" ? "/console" : "/dashboard")}
                className="flex items-center gap-3 py-3.5 text-[11px] uppercase tracking-[0.28em] text-[#f2ece0] hover:text-[#c68b73] transition-colors border-t border-[#f2ece0]/[0.06]"
                data-testid="m-nav-dashboard"
              >
                <LayoutDashboard size={14} /> {user.role === "interviewer" ? "Console" : "Dashboard"}
              </button>
              <button onClick={() => go("/profile")} className="flex items-center gap-3 py-3.5 text-[11px] uppercase tracking-[0.28em] text-[#f2ece0] hover:text-[#c68b73] transition-colors border-t border-[#f2ece0]/[0.06]" data-testid="m-nav-profile">
                <User size={14} /> Profile
              </button>
              <button
                onClick={async () => { setMenuOpen(false); await logout(); nav("/"); }}
                className="flex items-center gap-3 py-3.5 text-[11px] uppercase tracking-[0.28em] text-[#a8a094] hover:text-[#8a5052] transition-colors border-t border-[#f2ece0]/[0.06]"
                data-testid="m-nav-logout"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
