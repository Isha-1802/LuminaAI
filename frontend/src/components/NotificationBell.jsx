import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Bell, X, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get("/notifications/"),
        api.get("/notifications/unread-count")
      ]);
      setNotifications(notifRes.data);
      setUnread(countRes.data.count);
    } catch { /* Ignore - user may not be logged in */ }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 15 seconds for new notifications
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = async () => {
    setOpen(prev => !prev);
    if (!open && unread > 0) {
      try {
        await api.put("/notifications/mark-read");
        setUnread(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch {}
    }
  };

  const handleClick = (notif) => {
    setOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const fmt = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-[#a8a094] hover:text-[#f2ece0] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#c9a96e] rounded-full flex items-center justify-center text-[9px] text-[#0c0a09] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[340px] border border-[#f2ece0]/15 bg-[#111009] shadow-2xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f2ece0]/10">
              <div className="flex items-center gap-2 text-[#f2ece0] font-medium text-sm">
                <Bell size={14} className="text-[#c9a96e]" />
                Notifications
              </div>
              <button onClick={() => setOpen(false)} className="text-[#6b6459] hover:text-[#f2ece0]">
                <X size={14} />
              </button>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#6b6459] italic">
                  No notifications yet.
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.notification_id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-[#f2ece0]/[0.06] hover:bg-[#f2ece0]/[0.04] transition-colors ${!n.read ? "bg-[#c9a96e]/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${n.read ? "text-[#a8a094]" : "text-[#f2ece0]"}`}>
                          {n.title}
                          {!n.read && <span className="inline-block w-1.5 h-1.5 bg-[#c9a96e] rounded-full ml-2 mb-0.5" />}
                        </div>
                        <div className="text-xs text-[#6b6459] mt-0.5 leading-relaxed">{n.body}</div>
                      </div>
                      <div className="text-[10px] text-[#6b6459] shrink-0 pt-0.5">{fmt(n.created_at)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-[#f2ece0]/10">
                <div className="flex items-center gap-1 text-[10px] text-[#6b6459]">
                  <CheckCheck size={11} /> All caught up
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
