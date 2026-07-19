import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

/**
 * CountUp — number rolls up from 0 when it scrolls into view.
 * Handles decimals (keeps one place if the target has one).
 */
export default function CountUp({ value = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const decimals = Number.isInteger(Number(value)) ? 0 : 1;

  useEffect(() => {
    if (inView) mv.set(Number(value) || 0);
  }, [inView, value, mv]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = v.toFixed(decimals);
    });
    return unsub;
  }, [spring, decimals]);

  return <span ref={ref} className={className}>0</span>;
}
