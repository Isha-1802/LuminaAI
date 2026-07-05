import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

const GLYPHS = "▓▒░█▄▀╱╲░▒▓ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

/**
 * ScrambleText — decodes final text with a random-glyph animation.
 */
export default function ScrambleText({ text = "", duration = 1.2, className = "", trigger = "view", start = false }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const [out, setOut] = useState("");

  useEffect(() => {
    const active = trigger === "view" ? inView : start;
    if (!active || !text) return;
    let raf;
    const started = performance.now();
    const total = duration * 1000;
    const len = text.length;
    const tick = (now) => {
      const p = Math.min(1, (now - started) / total);
      const revealed = Math.floor(p * len);
      let s = "";
      for (let i = 0; i < len; i++) {
        if (i < revealed) s += text[i];
        else if (text[i] === " ") s += " ";
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, text, duration, trigger, start]);

  return <span ref={ref} className={className}>{out || text.replace(/./g, "█")}</span>;
}
