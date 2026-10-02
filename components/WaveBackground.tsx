"use client";

import { useEffect, useRef } from "react";

/**
 * Real, always-running animated background. A low-resolution canvas is painted
 * with drifting, hue-cycling aurora blobs, layered sine-wave ribbons and
 * floating glow particles, then upscaled and blurred by CSS. Rendering at 1/4
 * resolution keeps it smooth on phones while the blur hides the pixels.
 * Honours prefers-reduced-motion by drawing a single still frame.
 */
interface Blob {
  h: number;
  s: number;
  l: number;
  rx: number;
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  px: number;
  py: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  h: number;
}

const BLOBS: Blob[] = [
  { h: 152, s: 78, l: 60, rx: 0.5, ax: 0.32, ay: 0.26, sx: 0.13, sy: 0.11, px: 0.22, py: 0.24, phase: 0.0 },
  { h: 196, s: 82, l: 62, rx: 0.46, ax: 0.3, ay: 0.3, sx: 0.09, sy: 0.14, px: 0.8, py: 0.22, phase: 1.3 },
  { h: 268, s: 74, l: 64, rx: 0.48, ax: 0.28, ay: 0.3, sx: 0.11, sy: 0.09, px: 0.74, py: 0.82, phase: 2.4 },
  { h: 326, s: 72, l: 66, rx: 0.42, ax: 0.3, ay: 0.26, sx: 0.1, sy: 0.12, px: 0.24, py: 0.84, phase: 3.6 },
  { h: 174, s: 72, l: 64, rx: 0.4, ax: 0.34, ay: 0.24, sx: 0.07, sy: 0.1, px: 0.5, py: 0.5, phase: 4.8 },
  { h: 222, s: 80, l: 64, rx: 0.34, ax: 0.36, ay: 0.28, sx: 0.16, sy: 0.12, px: 0.62, py: 0.36, phase: 5.7 },
  { h: 300, s: 76, l: 66, rx: 0.32, ax: 0.32, ay: 0.32, sx: 0.12, sy: 0.16, px: 0.34, py: 0.62, phase: 0.9 },
];

export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SCALE = 0.25;
    let w = 0;
    let h = 0;
    let raf = 0;
    let particles: Particle[] = [];
    const start = performance.now();

    const seedParticles = () => {
      const count = Math.round(Math.min(46, (w * h) / 1200));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.8 + Math.random() * 2.4,
        vx: (Math.random() - 0.5) * 0.05,
        vy: -0.03 - Math.random() * 0.08,
        h: Math.random() * 360,
      }));
    };

    const resize = () => {
      w = Math.max(2, Math.round(window.innerWidth * SCALE));
      h = Math.max(2, Math.round(window.innerHeight * SCALE));
      canvas.width = w;
      canvas.height = h;
      seedParticles();
    };

    const paint = (now: number) => {
      const t = (now - start) / 1000;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // Aurora blobs
      for (const b of BLOBS) {
        const hue = (b.h + t * 9) % 360;
        const x = (b.px + Math.sin(t * b.sx + b.phase) * b.ax) * w;
        const y = (b.py + Math.cos(t * b.sy + b.phase * 1.4) * b.ay) * h;
        const rad = b.rx * Math.max(w, h) * (0.92 + 0.08 * Math.sin(t * 0.7 + b.phase));
        const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
        grad.addColorStop(0, `hsla(${hue}, ${b.s}%, ${b.l}%, 0.5)`);
        grad.addColorStop(0.55, `hsla(${hue}, ${b.s}%, ${b.l}%, 0.18)`);
        grad.addColorStop(1, `hsla(${hue}, ${b.s}%, ${b.l}%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sine-wave ribbons drifting along the lower half
      const step = Math.max(2, w / 46);
      for (let band = 0; band < 2; band += 1) {
        const amp = h * (0.045 + band * 0.03);
        const yBase = h * (0.72 + band * 0.11);
        const phase = t * (0.6 + band * 0.35);
        const hue = (168 + band * 70 + t * 9) % 360;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + step; x += step) {
          const y = yBase + Math.sin((x / w) * Math.PI * 3 + phase) * amp;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue}, 82%, 62%, 0.14)`;
        ctx.fill();
      }

      // Drifting glow particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        const hue = (p.h + t * 20) % 360;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `hsla(${hue}, 90%, 72%, 0.55)`);
        g.addColorStop(1, `hsla(${hue}, 90%, 72%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Travelling glossy highlight
      const hx = (0.5 + Math.sin(t * 0.07) * 0.42) * w;
      const hy = (0.42 + Math.cos(t * 0.09) * 0.34) * h;
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, Math.min(w, h) * 0.75);
      hg.addColorStop(0, "hsla(0, 0%, 100%, 0.5)");
      hg.addColorStop(1, "hsla(0, 0%, 100%, 0)");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(hx, hy, Math.min(w, h) * 0.75, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      if (!reduce) raf = requestAnimationFrame(paint);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="vm-bg" aria-hidden>
      <canvas ref={canvasRef} className="vm-bg-canvas" />
      <span className="vm-bg-grain" />
      <span className="vm-bg-vignette" />
    </div>
  );
}
