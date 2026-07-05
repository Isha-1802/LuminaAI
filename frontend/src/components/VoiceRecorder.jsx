import { useRef, useState, useEffect } from "react";
import { Mic, Loader2, Square } from "lucide-react";

/**
 * VoiceRecorder — push-to-talk mic capture with MediaRecorder → webm/opus.
 * Calls onCommit(blob) with the recorded audio.
 */
export default function VoiceRecorder({ onCommit, disabled = false, size = "md" }) {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => () => stop(true), []);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data && e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        }
        cancelAnimationFrame(rafRef.current);
        setLevel(0);
        if (blob.size > 800) onCommit && onCommit(blob);
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);

      // audio level meter
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += (data[i] - 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / data.length) / 40));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      setError(e.message || "Microphone denied");
    }
  };

  const stop = (silent = false) => {
    try {
      if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    } catch {}
    setRecording(false);
    if (silent) setError(null);
  };

  const S = size === "sm" ? "w-10 h-10" : "w-14 h-14";

  return (
    <div className="flex flex-col items-center gap-2" data-testid="voice-recorder">
      <button
        type="button"
        disabled={disabled}
        onClick={recording ? () => stop() : start}
        className={`relative ${S} rounded-full border transition-all duration-300 flex items-center justify-center ${
          recording
            ? "bg-[#5a1a24] border-[#5a1a24] text-[#f2ece0]"
            : "border-[#c9a96e] text-[#c9a96e] hover:bg-[#c9a96e] hover:text-[#0c0a09]"
        } disabled:opacity-40`}
        data-testid={recording ? "stop-recording-btn" : "start-recording-btn"}
      >
        {recording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
        {recording && (
          <span
            className="absolute inset-0 rounded-full border border-[#c9a96e]/40 pointer-events-none"
            style={{ transform: `scale(${1 + level * 0.6})`, transition: "transform 100ms linear" }}
          />
        )}
      </button>
      {error && <span className="text-[10px] uppercase tracking-[0.28em] text-[#8a5052]">{error}</span>}
    </div>
  );
}
