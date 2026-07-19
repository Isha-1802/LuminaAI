import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * TextReveal — words rise into focus from a soft blur. Clean editorial reveal,
 * no glyph-scramble gimmick.
 */
export default function TextReveal({ text = "", className = "", delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const words = text.split(" ");

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.26em] last:mr-0 pb-[0.08em]">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0, filter: "blur(6px)" }}
            animate={inView ? { y: "0%", opacity: 1, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.9, delay: delay + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
