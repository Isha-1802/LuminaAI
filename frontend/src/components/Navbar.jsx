import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut, LayoutDashboard, Search, User } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const onLanding = location.pathname === "/";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#0c0a09]/70 border-b border-[#f2ece0]/[0.06]"
      data-testid="app-navbar"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-[68px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" data-testid="brand-link">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-[#c9a96e]" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#c9a96e] blur-md" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display italic text-[22px] tracking-tight text-[#f2ece0]">Lumina</span>
            <span className="overline text-[#c9a96e]/70">Nº 01</span>
          </div>
        </Link>



        <div className="flex items-center gap-4">
          {user ? (
            <>
              {(user.role === "candidate" || user.role === "interviewee") && (
                <button
                  onClick={() => nav("/experts")}
                  className="hidden sm:inline-flex items-center gap-2 overline hover:text-[#c9a96e] transition-colors"
                  data-testid="nav-experts-btn"
                >
                  <Search size={12} /> Find Interviewers
                </button>
              )}
              {user.role === "interviewer" ? (
                <button
                  onClick={() => nav("/console")}
                  className="hidden sm:inline-flex items-center gap-2 overline hover:text-[#c9a96e] transition-colors"
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
                    src={user.picture.startsWith("http") ? user.picture : `${import.meta.env.VITE_API_URL || "http://localhost:8000"}${user.picture}`} 
                    alt="Profile" 
                    className="w-5 h-5 rounded-full object-cover border border-[#c9a96e]/30" 
                  />
                ) : (
                  <User size={12} /> 
                )}
                Profile
              </button>
              <NotificationBell />
              <button
                onClick={async () => { await logout(); nav("/"); }}
                className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-[11px] uppercase tracking-[0.28em] text-[#f2ece0] border border-[#f2ece0]/15 hover:border-[#c9a96e]/60 transition-all"
                data-testid="nav-logout-btn"
              >
                <LogOut size={11} /> Logout
              </button>
            </>
          ) : (
            <Link
                to="/auth?mode=login"
                className="group relative inline-flex items-center gap-2 px-6 py-2.5 text-[11px] uppercase tracking-[0.28em] text-[#0c0a09] bg-[#f2ece0] hover:bg-[#c9a96e] transition-all"
                data-testid="nav-signup-btn"
              >
                Login / Sign Up
              </Link>
          )}
        </div>
      </div>
    </header>
  );
}
