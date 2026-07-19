import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

let rippleId = 0;

/**
 * Ripple — wraps a clickable element and spawns a gold ping at the click point.
 * Pass a single child (button/a); forwards onClick.
 */
export default function Ripple({ children, className = "", color = "rgba(198,139,115,0.45)" }) {
  const [ripples, setRipples] = useState([]);

  const onClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const id = ++rippleId;
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top, size }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 650);
  }, []);

  return (
    <span onClick={onClick} className={`relative overflow-hidden ${className}`}>
      {children}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 0.55, scale: 0 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: r.x - r.size / 2,
              top: r.y - r.size / 2,
              width: r.size,
              height: r.size,
              background: color,
            }}
          />
        ))}
      </AnimatePresence>
    </span>
  );
}
