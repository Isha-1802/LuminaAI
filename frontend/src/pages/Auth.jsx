import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, User, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { login, register, user } = useAuth();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [role, setRole] = useState("interviewee");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  useEffect(() => {
    if (params.get("error") === "google") {
      toast.error("Google sign-in failed. Please try again.");
    }
  }, [params]);

  const onGoogle = () => {
    const redirect = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await register({ ...form, role });
        toast.success("Welcome to the atelier.");
      } else {
        await login(form.email, form.password);
        toast.success("Welcome back.");
      }
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-[#f2ece0] flex" data-testid="auth-page">
      {/* Left — editorial */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-r border-[#f2ece0]/[0.06]">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-[#c9a96e]/[0.09] blur-[130px]" />
          <div className="absolute bottom-0 -right-40 w-[520px] h-[520px] rounded-full bg-[#5a1a24]/[0.10] blur-[140px]" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-20 w-full">
          <Link to="/" className="flex items-center gap-3" data-testid="auth-brand">
            <div className="w-2 h-2 rounded-full bg-[#c9a96e]" />
            <span className="font-display italic text-3xl">Lumina</span>
            <span className="overline text-[#c9a96e]/70 ml-2">Nº 01</span>
          </Link>

          <div>
            <div className="overline-gold mb-6">Preface</div>
            <h1 className="font-display text-5xl xl:text-7xl leading-[0.96] tracking-[-0.03em]">
              A private atelier for
              <br />
              <span className="font-display-italic text-shimmer">the interview room.</span>
            </h1>
            <p className="mt-10 max-w-md text-[#a8a094] leading-relaxed">
              Lumina is not a coaching app. It is a house of counsel — cinematic, precise, and privately yours. Enter to begin the rehearsal.
            </p>
            <div className="mt-12 flex items-center gap-4">
              <div className="w-12 h-px bg-[#c9a96e]" />
              <span className="overline">Est. MMXXVI · San Francisco</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="overline">Volume I · Winter</span>
            <span className="font-display italic text-[#f2ece0]/40 text-4xl">01</span>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className="lg:hidden mb-10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#c9a96e]" />
            <span className="font-display italic text-2xl">Lumina</span>
          </div>

          <div className="overline-gold mb-4">{mode === "signup" ? "Correspondence — 01" : "Correspondence — 02"}</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-[-0.02em] leading-[1.02]" data-testid="auth-title">
            {mode === "signup" ? "Begin the rehearsal." : (
              <>Welcome <span className="font-display-italic">back</span>.</>
            )}
          </h2>

          <button
            onClick={onGoogle}
            className="mt-10 w-full inline-flex items-center justify-center gap-3 bg-[#f2ece0] text-[#0c0a09] px-6 py-4 text-[11px] uppercase tracking-[0.28em] font-medium hover:bg-[#c9a96e] transition-all duration-500"
            data-testid="google-auth-btn"
          >
            <FcGoogle size={20} /> Continue with Google
          </button>

          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-[#f2ece0]/[0.1]" />
            <span className="overline">or by letter</span>
            <div className="flex-1 h-px bg-[#f2ece0]/[0.1]" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3" data-testid="auth-form">
            {mode === "signup" && (
              <div className="relative">
                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6459]" />
                <input
                  required
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-transparent border border-[#f2ece0]/[0.1] pl-12 pr-4 py-4 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c9a96e] transition-colors"
                  data-testid="signup-name-input"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6459]" />
              <input
                required
                type="email"
                placeholder="you@work.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-transparent border border-[#f2ece0]/[0.1] pl-12 pr-4 py-4 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c9a96e] transition-colors"
                data-testid="auth-email-input"
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6459]" />
              <input
                required
                type="password"
                placeholder="Password"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-transparent border border-[#f2ece0]/[0.1] pl-12 pr-4 py-4 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c9a96e] transition-colors"
                data-testid="auth-password-input"
              />
            </div>

            {mode === "signup" && (
              <div className="flex items-stretch border border-[#f2ece0]/[0.1]" data-testid="role-toggle">
                {[
                  { id: "interviewee", label: "I'm interviewing" },
                  { id: "interviewer", label: "I interview others" },
                ].map((r, i) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`flex-1 py-3.5 text-[10px] uppercase tracking-[0.28em] transition-all duration-300 ${
                      role === r.id ? "bg-[#f2ece0] text-[#0c0a09]" : "text-[#a8a094] hover:text-[#f2ece0]"
                    } ${i > 0 ? "border-l border-[#f2ece0]/[0.1]" : ""}`}
                    data-testid={`role-${r.id}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-6 w-full inline-flex items-center justify-center gap-3 border border-[#c9a96e] text-[#f2ece0] px-6 py-4 text-[11px] uppercase tracking-[0.32em] font-medium hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-all duration-500 disabled:opacity-50"
              data-testid="auth-submit-btn"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              {mode === "signup" ? "Enter the atelier" : "Continue"}
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="mt-10 text-sm text-[#a8a094] text-center">
            {mode === "signup" ? (
              <>Already invited?{" "}
                <button className="text-[#c9a96e] hover:text-[#f2ece0] transition-colors underline-offset-4 hover:underline" onClick={() => setMode("login")} data-testid="switch-to-login">Enter</button>
              </>
            ) : (
              <>New to Lumina?{" "}
                <button className="text-[#c9a96e] hover:text-[#f2ece0] transition-colors underline-offset-4 hover:underline" onClick={() => setMode("signup")} data-testid="switch-to-signup">Request invitation</button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
