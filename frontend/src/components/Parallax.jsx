import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

/**
 * ParallaxImage — an editorial image band whose photo drifts slower than the page,
 * creating depth. Content passed as children floats above it.
 */
export function ParallaxImage({
  src,
  children,
  className = "",
  height = "h-[420px]",
  strength = 18,
  opacity = 0.32,
  overlay = "from-[#0c0a09] via-[#0c0a09]/55 to-[#0c0a09]",
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1.02, 1.12]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${height} ${className}`}>
      <motion.div
        style={{ y, scale, backgroundImage: `url(${src})`, opacity }}
        className="absolute inset-[-20%] bg-cover bg-center will-change-transform"
        aria-hidden="true"
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${overlay}`} aria-hidden="true" />
      {children && <div className="relative h-full">{children}</div>}
    </div>
  );
}

/**
 * ParallaxLayer — drifts any content vertically as it scrolls through the viewport.
 * Use for decorative type, numerals, or floating cards.
 */
export function ParallaxLayer({ children, className = "", strength = 60, damping = 30 }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const raw = useTransform(scrollYProgress, [0, 1], [strength, -strength]);
  const y = useSpring(raw, { stiffness: 90, damping, restDelta: 0.001 });
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * AuroraField — layered colored light that replaces flat black with depth.
 *
 * Built from radial-gradients rather than blurred divs: a `filter: blur(120px)`
 * on animated elements forces expensive repaints every frame, which visibly
 * degrades scrolling on mid-range machines. Gradients are composited for free,
 * so this stays smooth while looking the same.
 */
const AURORA = {
  default: `
    radial-gradient(60rem 40rem at 8% -5%, rgba(198,139,115,0.17), transparent 62%),
    radial-gradient(52rem 38rem at 88% 12%, rgba(90,26,36,0.30), transparent 60%),
    radial-gradient(46rem 34rem at 45% 78%, rgba(226,180,140,0.09), transparent 64%),
    radial-gradient(70rem 60rem at 50% 40%, rgba(24,18,16,0.55), transparent 70%)`,
  ember: `
    radial-gradient(56rem 40rem at 78% -8%, rgba(138,80,82,0.30), transparent 60%),
    radial-gradient(50rem 36rem at 4% 48%, rgba(198,139,115,0.16), transparent 62%),
    radial-gradient(46rem 36rem at 42% 92%, rgba(90,26,36,0.26), transparent 62%)`,
  cool: `
    radial-gradient(58rem 42rem at 6% 4%, rgba(60,90,110,0.22), transparent 62%),
    radial-gradient(50rem 36rem at 82% 38%, rgba(198,139,115,0.14), transparent 60%),
    radial-gradient(46rem 36rem at 30% 86%, rgba(90,26,36,0.24), transparent 62%)`,
};

export function AuroraField({ variant = "default" }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-[#0c0a09]" />
      <div
        className="absolute inset-0 aurora-drift"
        style={{ backgroundImage: AURORA[variant] || AURORA.default }}
      />
      {/* Fine grain so the gradients never read as flat plastic */}
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
