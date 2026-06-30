"use client";

import { useCallback, useRef } from "react";
import html2canvas from "html2canvas-pro";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
  delay: number;
}

const SAMPLE_STEP = 7; // px between sampled particles (lower = denser/slower)
const WIND = 2.6; // rightward drift ("blowing")
const DURATION = 1300; // ms

/**
 * "Sand blowing in the air" dissolve. Snapshots a DOM element with
 * html2canvas-pro (needed because Tailwind v4 emits oklch() colors that plain
 * html2canvas can't parse), turns it into drifting particles on an overlay
 * canvas, animates them away, then resolves.
 *
 * Returns a ref to attach to the overlay <canvas> and a `start(target)` runner.
 */
export function useDissolve() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const start = useCallback(async (target: HTMLElement): Promise<void> => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = target.getBoundingClientRect();
    const snap = await html2canvas(target, {
      backgroundColor: null,
      scale: 1,
      logging: false,
      useCORS: true,
    });
    // Hide the source the instant we have its pixels, so particles don't ghost
    // over the still-visible element.
    target.style.visibility = "hidden";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);

    // Read snapshot pixels once.
    const sctx = snap.getContext("2d");
    if (!sctx) return;
    const scaleX = rect.width / snap.width;
    const scaleY = rect.height / snap.height;
    const img = sctx.getImageData(0, 0, snap.width, snap.height).data;

    const particles: Particle[] = [];
    for (let sy = 0; sy < snap.height; sy += SAMPLE_STEP) {
      for (let sx = 0; sx < snap.width; sx += SAMPLE_STEP) {
        const idx = (sy * snap.width + sx) * 4;
        const a = img[idx + 3];
        if (a < 24) continue;
        particles.push({
          x: rect.left + sx * scaleX,
          y: rect.top + sy * scaleY,
          vx: WIND + Math.random() * 2.2,
          vy: -0.4 - Math.random() * 1.6,
          size: Math.max(1, SAMPLE_STEP * scaleX),
          r: img[idx],
          g: img[idx + 1],
          b: img[idx + 2],
          a: a / 255,
          // Stagger left-to-right so it reads as wind sweeping across.
          delay: (sx / snap.width) * 420 + Math.random() * 120,
        });
      }
    }

    return new Promise<void>((resolve) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const elapsed = now - t0;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        let alive = 0;
        for (const p of particles) {
          const local = elapsed - p.delay;
          if (local <= 0) {
            // Not yet blown — draw in place.
            ctx.globalAlpha = p.a;
            ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            alive++;
            continue;
          }
          const life = local / (DURATION - p.delay);
          if (life >= 1) continue;
          alive++;
          // Drift + turbulence + gentle gravity.
          p.vy += 0.018;
          p.x += p.vx + Math.sin((p.y + local) * 0.01) * 0.8;
          p.y += p.vy;
          ctx.globalAlpha = Math.max(0, p.a * (1 - life));
          ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1;
        if (alive > 0 && elapsed < DURATION + 400) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          resolve();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  const cancel = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  return { canvasRef, start, cancel };
}
