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

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      nav("/auth?mode=login", { replace: true });
      return;
    }
    const sessionId = match[1];

    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id: sessionId });
        setUser(data.user);
        window.history.replaceState(null, "", window.location.pathname);
        nav("/dashboard", { replace: true, state: { user: data.user } });
      } catch (e) {
        console.error("Google session exchange failed", e);
        nav("/auth?mode=login&error=google", { replace: true });
      }
    })();
  }, [nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0a09]" data-testid="auth-callback">
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 border border-[#f2ece0]/10 border-t-[#c9a96e] rounded-full animate-spin" />
        <span className="overline">Establishing your correspondence</span>
      </div>
    </div>
  );
}
