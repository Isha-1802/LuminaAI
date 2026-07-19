import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles, History, ArrowLeft, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ChatMarkdown from "@/components/ChatMarkdown";

const SUGGESTIONS = [
  "What should I improve first?",
  "Explain how database indexing works",
  "Help me debug a React useEffect loop",
];

const fmtWhen = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / 86400000;
  if (days < 1) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function CoachChat() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("chat"); // "chat" | "history"
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, view]);

  // Candidates only, and never inside a live interview room
  const hidden =
    !user ||
    user.role === "interviewer" ||
    /^\/interview\/(?!new)[^/]+$/.test(location.pathname) ||
    location.pathname === "/" ||
    location.pathname.startsWith("/auth");
  if (hidden) return null;

  // Close = archive: the thread is already saved server-side, so reopening starts fresh
  const close = () => {
    setOpen(false);
    setView("chat");
    setChatId(null);
    setMessages([]);
    setInput("");
  };

  const toggle = () => (open ? close() : setOpen(true));

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || busy) return;
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setBusy(true);
    try {
      const { data } = await api.post("/chat/coach", { chat_id: chatId, content });
      setChatId(data.chat_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I couldn't reach the counsel just now — try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async () => {
    setView("history");
    try {
      const { data } = await api.get("/chat/coach/history");
      setHistory(data);
    } catch {
      setHistory([]);
    }
  };

  const resumeChat = async (id) => {
    try {
      const { data } = await api.get(`/chat/coach/history/${id}`);
      setChatId(data.chat_id);
      setMessages((data.messages || []).map(({ role, content }) => ({ role, content })));
      setView("chat");
    } catch {
      setView("chat");
    }
  };

  const newChat = () => {
    setChatId(null);
    setMessages([]);
    setView("chat");
  };

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        onClick={toggle}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#c68b73] text-[#0c0a09] flex items-center justify-center shadow-[0_8px_30px_rgba(198,139,115,0.35)] hover:scale-110 transition-transform"
        data-testid="coach-chat-trigger"
        aria-label="Ask Lumina Coach"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-6 z-50 w-[min(420px,calc(100vw-3rem))] h-[560px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl bg-[#12100e]/95 backdrop-blur-2xl border border-[#f2ece0]/[0.12] shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden"
            data-testid="coach-chat-panel"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#f2ece0]/[0.08] flex items-center gap-3">
              {view === "history" ? (
                <button
                  onClick={() => setView("chat")}
                  className="text-[#a8a094] hover:text-[#f2ece0] transition-colors"
                  aria-label="Back to chat"
                  data-testid="coach-history-back"
                >
                  <ArrowLeft size={16} />
                </button>
              ) : (
                <span className="w-9 h-9 rounded-full bg-[#c68b73]/15 border border-[#c68b73]/40 flex items-center justify-center text-[#c68b73]">
                  <Sparkles size={15} />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl text-[#f2ece0] leading-none">
                  {view === "history" ? "Past conversations" : "The Coach"}
                </div>
                <div className="overline mt-1 text-[#a8a094]">
                  {view === "history" ? "Pick up where you left off" : "Ask anything · Knows your rehearsals"}
                </div>
              </div>
              {view === "chat" && (
                <button
                  onClick={openHistory}
                  className="text-[#a8a094] hover:text-[#c68b73] transition-colors"
                  title="Past conversations"
                  aria-label="Past conversations"
                  data-testid="coach-history-btn"
                >
                  <History size={17} />
                </button>
              )}
            </div>

            {/* History view */}
            {view === "history" && (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5" data-testid="coach-history-list">
                <button
                  onClick={newChat}
                  className="w-full flex items-center gap-3 text-left rounded-xl px-4 py-3.5 border border-dashed border-[#c68b73]/30 text-[#c68b73] hover:bg-[#c68b73]/10 transition-colors text-sm"
                  data-testid="coach-new-chat-btn"
                >
                  <Plus size={15} /> Start a new conversation
                </button>
                {history === null && (
                  <div className="py-10 text-center">
                    <Loader2 size={17} className="animate-spin text-[#c68b73] mx-auto" />
                  </div>
                )}
                {(history || []).map((h) => (
                  <button
                    key={h.chat_id}
                    onClick={() => resumeChat(h.chat_id)}
                    className="w-full text-left rounded-xl px-4 py-3.5 hover:bg-[#f2ece0]/[0.06] transition-colors group"
                    data-testid={`coach-history-item-${h.chat_id}`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-[#e8e2d6] truncate group-hover:text-[#f2ece0]">{h.title}</span>
                      <span className="overline text-[#6b6459] shrink-0">{fmtWhen(h.updated_at || h.created_at)}</span>
                    </div>
                  </button>
                ))}
                {history !== null && history.length === 0 && (
                  <p className="text-sm text-[#6b6459] text-center py-10">No past conversations yet.</p>
                )}
              </div>
            )}

            {/* Chat view */}
            {view === "chat" && (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                  {messages.length === 0 && (
                    <div className="pt-6">
                      <p className="text-sm text-[#a8a094] leading-relaxed mb-5">
                        Ask me anything — code, concepts, career, or life admin.
                        I've also read every rehearsal you've done here, so I can tell you
                        exactly where you're losing points.
                      </p>
                      <div className="space-y-2">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => send(s)}
                            className="block w-full text-left text-sm text-[#c68b73] border border-[#c68b73]/25 rounded-xl px-4 py-3 hover:bg-[#c68b73]/10 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-[#c68b73] text-[#0c0a09] rounded-br-md whitespace-pre-wrap"
                            : "bg-[#f2ece0]/[0.06] text-[#e8e2d6] border border-[#f2ece0]/[0.08] rounded-bl-md"
                        }`}
                      >
                        {m.role === "user" ? m.content : <ChatMarkdown content={m.content} />}
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="flex justify-start">
                      <div className="bg-[#f2ece0]/[0.06] border border-[#f2ece0]/[0.08] rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 size={15} className="animate-spin text-[#c68b73]" />
                      </div>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); send(); }}
                  className="p-4 border-t border-[#f2ece0]/[0.08] flex items-center gap-3"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask the coach…"
                    className="flex-1 bg-[#0c0a09]/60 border border-[#f2ece0]/[0.1] rounded-xl px-4 py-3 text-sm text-[#f2ece0] placeholder-[#6b6459] focus:outline-none focus:border-[#c68b73] transition-colors"
                    data-testid="coach-chat-input"
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="w-11 h-11 rounded-xl bg-[#c68b73] text-[#0c0a09] flex items-center justify-center disabled:opacity-40 hover:bg-[#e2b48c] transition-colors shrink-0"
                    data-testid="coach-chat-send"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
