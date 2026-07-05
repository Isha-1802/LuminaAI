import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CircleDot, Loader2 } from "lucide-react";

/**
 * WebcamPanel — mounts <video>, records via MediaRecorder, samples "presence" every 500ms
 * using naive luminance-variance (as a stand-in for face-detection). Exposes:
 *   start() / stop() / getRecording() → { blob, presencePct, speakingPct, duration }
 */
export default function WebcamPanel({ active, onStop }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const presenceSamplesRef = useRef([]);
  const speakingSamplesRef = useRef([]);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [engagement, setEngagement] = useState(0);

  useEffect(() => {
    if (active) start();
    else stopInternal(false);
    return () => stopInternal(false);
    // eslint-disable-next-line
  }, [active]);

  const sampleFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (videoRef.current.readyState < 2) return;
    ctx.drawImage(videoRef.current, 0, 0, c.width, c.height);
    const cx = c.width / 2, cy = c.height / 2;
    const rx = c.width * 0.28, ry = c.height * 0.36;
    const img = ctx.getImageData(cx - rx, cy - ry, rx * 2, ry * 2).data;
    // luminance mean + variance
    let sum = 0, sum2 = 0;
    const n = img.length / 4;
    for (let i = 0; i < img.length; i += 4) {
      const l = 0.2126 * img[i] + 0.7152 * img[i + 1] + 0.0722 * img[i + 2];
      sum += l; sum2 += l * l;
    }
    const mean = sum / n;
    const varr = sum2 / n - mean * mean;
    const presence = mean > 22 && varr > 60 ? 1 : 0; // heuristic
    presenceSamplesRef.current.push(presence);

    // mic level
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(data);
      let s = 0;
      for (let i = 0; i < data.length; i++) s += (data[i] - 128) ** 2;
      const level = Math.sqrt(s / data.length);
      speakingSamplesRef.current.push(level > 6 ? 1 : 0);
    }

    // rolling engagement
    const arr = presenceSamplesRef.current.slice(-20);
    setEngagement(Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100));
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);

      // audio analyser for speaking heuristic
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      // Recorder
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 900_000 });
      rec.ondataavailable = (e) => e.data && e.data.size > 0 && chunksRef.current.push(e.data);
      rec.start(2000);
      recRef.current = rec;
      startTimeRef.current = Date.now();

      // Sampling loop @ 2 Hz
      const loop = () => {
        sampleFrame();
        rafRef.current = setTimeout(() => requestAnimationFrame(loop), 500);
      };
      loop();
    } catch (e) {
      setError(e.name === "NotAllowedError" ? "Camera denied" : e.message);
    }
  };

  const finalize = () => {
    return new Promise((resolve) => {
      if (!recRef.current) return resolve(null);
      const rec = recRef.current;
      const finish = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const duration = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
        const p = presenceSamplesRef.current;
        const s = speakingSamplesRef.current;
        const presencePct = p.length ? (p.reduce((a, b) => a + b, 0) / p.length) * 100 : 0;
        const speakingPct = s.length ? (s.reduce((a, b) => a + b, 0) / s.length) * 100 : 0;
        resolve({ blob, duration, presencePct, speakingPct });
      };
      if (rec.state === "inactive") return finish();
      rec.onstop = finish;
      try { rec.stop(); } catch { finish(); }
    });
  };

  const stopInternal = async (fireCallback = true) => {
    clearTimeout(rafRef.current);
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    let payload = null;
    if (recRef.current) {
      payload = await finalize();
      recRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setReady(false);
    if (fireCallback && payload && onStop) onStop(payload);
  };

  return (
    <div className="relative border border-[#f2ece0]/[0.1] bg-[#0c0a09] overflow-hidden" data-testid="webcam-panel">
      {/* HUD corner brackets */}
      <div className="absolute inset-2 pointer-events-none z-10">
        {["top-0 left-0 border-l border-t", "top-0 right-0 border-r border-t", "bottom-0 left-0 border-l border-b", "bottom-0 right-0 border-r border-b"].map((c, i) => (
          <div key={i} className={`absolute ${c} border-[#c9a96e]/60 w-4 h-4`} />
        ))}
      </div>
      <div className="aspect-video relative">
        {ready ? (
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" data-testid="webcam-video" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#a8a094]">
            {error ? (
              <><CameraOff size={22} className="text-[#8a5052]" /><span className="overline mt-3">{error}</span></>
            ) : (
              <><Loader2 size={20} className="animate-spin text-[#c9a96e]" /><span className="overline mt-3">Initialising counsel view</span></>
            )}
          </div>
        )}
        <canvas ref={canvasRef} width={320} height={240} className="hidden" />
        {ready && (
          <>
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <CircleDot size={10} className="text-[#5a1a24] animate-pulse" fill="currentColor" />
              <span className="overline-gold text-[9px]">REC</span>
            </div>
            <div className="absolute top-3 right-3 overline-gold text-[9px]">
              Engagement · <span className="text-[#f2ece0]">{engagement}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
