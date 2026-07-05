import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * MagneticButton — a button whose contents get pulled toward the cursor on hover.
 * Wraps any element; strength = pull distance.
 */
export default function MagneticButton({ children, strength = 18, className = "", ...rest }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    setPos({ x: (x / rect.width) * strength, y: (y / rect.height) * strength });
  };
  const onLeave = () => setPos({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      animate={pos}
      transition={{ type: "spring", stiffness: 250, damping: 18, mass: 0.5 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
