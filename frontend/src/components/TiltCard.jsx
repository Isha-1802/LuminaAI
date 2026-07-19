import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * TiltCard — subtle 3D tilt-toward-cursor wrapper for card-style content.
 */
export default function TiltCard({ children, className = "", strength = 10, glow = true, ...rest }) {
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [strength, -strength]), { stiffness: 300, damping: 24 });
  const ry = useSpring(useTransform(mx, [0, 1], [-strength, strength]), { stiffness: 300, damping: 24 });
  const glowX = useTransform(mx, [0, 1], ["0%", "100%"]);
  const glowY = useTransform(my, [0, 1], ["0%", "100%"]);

  const onMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: "preserve-3d" }}
      className={`relative ${className}`}
      {...rest}
    >
      {glow && (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(220px circle at ${glowX} ${glowY}, rgba(198,139,115,0.12), transparent 65%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
