import { motion, useScroll, useTransform } from "framer-motion";

const VARIANTS = {
  default: [
    { cls: "-top-32 -right-32 w-[560px] h-[560px]", color: "#c68b73", opacity: 0.06, blur: 140 },
    { cls: "top-1/2 -left-40 w-[480px] h-[480px]", color: "#5a1a24", opacity: 0.08, blur: 150 },
  ],
  warm: [
    { cls: "-top-20 -left-20 w-[460px] h-[460px]", color: "#c68b73", opacity: 0.07, blur: 130 },
    { cls: "bottom-0 -right-32 w-[520px] h-[520px]", color: "#5a1a24", opacity: 0.09, blur: 150 },
  ],
  quiet: [
    { cls: "top-0 left-1/2 -translate-x-1/2 w-[640px] h-[280px]", color: "#c68b73", opacity: 0.04, blur: 150 },
  ],
};

export default function AmbientBackground({ variant = "default", parallax = false }) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", parallax ? "-25%" : "0%"]);
  const blobs = VARIANTS[variant] || VARIANTS.default;

  return (
    <motion.div style={{ y }} className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${b.cls}`}
          style={{ background: b.color, opacity: b.opacity, filter: `blur(${b.blur}px)` }}
        />
      ))}
    </motion.div>
  );
}
