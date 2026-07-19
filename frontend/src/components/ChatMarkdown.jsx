import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * ChatMarkdown — minimal markdown renderer for coach replies.
 * Handles fenced code blocks, inline code, bold, headings and bullet/numbered lists.
 * Deliberately dependency-free: the model's output only uses this small subset.
 */

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="my-3 rounded-lg border border-[#f2ece0]/[0.1] overflow-hidden bg-[#0c0a09]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#f2ece0]/[0.08]">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#6b6459]">{lang || "code"}</span>
        <button
          type="button"
          onClick={copy}
          className="text-[#6b6459] hover:text-[#c68b73] transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <pre className="px-3 py-2.5 overflow-x-auto text-[12px] leading-relaxed text-[#e8e2d6]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Bold + inline code within a line
function renderInline(text, keyBase) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={`${keyBase}-b${i}`} className="font-semibold text-[#f2ece0]">{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code key={`${keyBase}-c${i}`} className="px-1.5 py-0.5 rounded bg-[#f2ece0]/[0.08] text-[#e2b48c] text-[12px]">
          {p.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${keyBase}-t${i}`}>{p}</span>;
  });
}

export default function ChatMarkdown({ content = "" }) {
  // Split on fenced code blocks first
  const segments = String(content).split(/```(\w*)\n?([\s\S]*?)```/g);
  const out = [];

  for (let i = 0; i < segments.length; i++) {
    // Pattern repeats: [text, lang, code, text, lang, code, ...]
    if (i % 3 === 0) {
      const text = segments[i];
      if (!text?.trim()) continue;
      const lines = text.split("\n");
      let bullets = [];

      const flushBullets = (key) => {
        if (!bullets.length) return;
        out.push(
          <ul key={`ul-${key}`} className="my-2 space-y-1 pl-1">
            {bullets.map((b, bi) => (
              <li key={bi} className="flex gap-2">
                <span className="text-[#c68b73] shrink-0">•</span>
                <span>{renderInline(b, `li-${key}-${bi}`)}</span>
              </li>
            ))}
          </ul>
        );
        bullets = [];
      };

      lines.forEach((line, li) => {
        const trimmed = line.trim();
        const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
        const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
        const heading = trimmed.match(/^#{1,6}\s+(.*)$/);

        if (bullet) return bullets.push(bullet[1]);
        if (numbered) return bullets.push(numbered[1]);
        flushBullets(`${i}-${li}`);

        if (heading) {
          out.push(
            <div key={`h-${i}-${li}`} className="font-semibold text-[#f2ece0] mt-3 mb-1">
              {renderInline(heading[1], `h-${i}-${li}`)}
            </div>
          );
        } else if (trimmed) {
          out.push(
            <p key={`p-${i}-${li}`} className="my-1.5">
              {renderInline(trimmed, `p-${i}-${li}`)}
            </p>
          );
        }
      });
      flushBullets(`${i}-end`);
    } else if (i % 3 === 2) {
      out.push(<CodeBlock key={`code-${i}`} lang={segments[i - 1]} code={segments[i].replace(/\n$/, "")} />);
    }
  }

  return <div className="text-sm leading-relaxed">{out}</div>;
}
