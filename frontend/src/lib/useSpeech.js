import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useSpeech — the counsel's voice, via the browser's built-in SpeechSynthesis.
 *
 * Server-side TTS is intentionally not used: it costs per character and adds
 * latency before the candidate hears anything. The browser engine is instant,
 * free, and works offline.
 */

// Prefer natural-sounding voices; these ship on macOS/iOS, Windows and Chrome.
const PREFERRED = [
  "Samantha", "Google UK English Female", "Microsoft Aria Online (Natural) - English (United States)",
  "Google US English", "Karen", "Moira", "Microsoft Zira", "Serena",
];

function pickVoice(voices) {
  if (!voices.length) return null;
  for (const name of PREFERRED) {
    const hit = voices.find((v) => v.name === name);
    if (hit) return hit;
  }
  return voices.find((v) => v.lang?.startsWith("en")) || voices[0];
}

// Strip markdown/symbols the engine would read aloud as gibberish
function clean(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " code block omitted. ")
    .replace(/[*_#`>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default function useSpeech(enabled = true) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const voiceRef = useRef(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    setSupported(true);

    const load = () => {
      const v = pickVoice(synth.getVoices() || []);
      if (v) voiceRef.current = v;
    };
    load();
    // Voices load asynchronously in Chrome
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      synth.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text) => {
      const synth = window.speechSynthesis;
      if (!synth || !enabled) return;
      const body = clean(text);
      if (!body) return;

      synth.cancel(); // never let two lines overlap
      const u = new SpeechSynthesisUtterance(body);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 0.98;   // a touch under default reads as measured, not rushed
      u.pitch = 1.0;
      u.volume = 1.0;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    },
    [enabled]
  );

  // Never keep talking after the user leaves the room
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return { speak, stop, speaking, supported };
}
