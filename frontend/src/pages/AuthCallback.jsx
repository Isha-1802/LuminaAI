import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    
    if (!token) {
      nav("/auth?mode=login", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id: token });
        let currentUser = data.user;
        
        // Check if there is a pending role selection from Google Auth
        const pendingRole = localStorage.getItem("pending_role");
        if (pendingRole) {
          const roleRes = await api.patch("/auth/me/role", { role: pendingRole });
          currentUser = roleRes.data;
          localStorage.removeItem("pending_role");
        }
        
        setUser(currentUser);
        window.history.replaceState(null, "", window.location.pathname);
        nav("/", { replace: true, state: { user: currentUser } });
      } catch (e) {
        console.error("Google session exchange failed", e);
        nav("/auth?mode=login&error=google", { replace: true });
      }
    })();
  }, [nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0a09]" data-testid="auth-callback">
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 border border-[#f2ece0]/10 border-t-[#c68b73] rounded-full animate-spin" />
        <span className="overline">Establishing your correspondence</span>
      </div>
    </div>
  );
}
