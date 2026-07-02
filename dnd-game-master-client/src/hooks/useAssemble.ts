"use client";

import { useCallback, useRef } from "react";
import html2canvas from "html2canvas-pro";

interface AssembleParticle {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
  delay: number;
}

const SAMPLE_STEP = 7;
const DURATION = 1300; // ms
const WIND_OFFSET_X = -600; // Start 600px to the left
const WIND_OFFSET_Y = 100; // Start slightly lower

// Easing so particles slow down naturally as they lock into place.
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Reverse of useDissolve: particles blow in from the air and assemble into the
 * target element.
 *
 * Split into prepare()/run() so the (expensive) html2canvas-pro capture can be
 * done up front — during the outgoing dissolve — and the animation can then
 * start instantly for a seamless, zero-gap handoff.
 *
 * FOUC fix: the target stays visibility:hidden; `onclone` makes only the clone
 * visible for the screenshot. The real element is revealed once the sand forms.
 *
 * End positions are computed against the viewport box (0,0 → innerWidth,
 * innerHeight) — the area the full-screen target will occupy once it's the
 * active view — so capture can happen while the target is still off-screen.
 */
export function useAssemble() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<AssembleParticle[]>([]);
  const targetRef = useRef<HTMLElement | null>(null);
  const prepPromiseRef = useRef<Promise<void> | null>(null);

  const prepare = useCallback((target: HTMLElement): Promise<void> => {
    targetRef.current = target;
    const promise = (async () => {
      target.setAttribute("data-sand-target", "true");
      let snap; try {
        snap = await html2canvas(target, {
          backgroundColor: null,
          scale: 1,
          logging: false,
          useCORS: true,
          onclone: (clonedDoc) => {
            const clonedTarget = clonedDoc.querySelector(
              '[data-sand-target="true"]',
            ) as HTMLElement | null;
            if (clonedTarget) {
              // Aggressively strip opacity: 0 from Framer Motion elements
              // so we don't need any delay before taking the snapshot.
              const allEls = clonedTarget.querySelectorAll("*");
              allEls.forEach((el) => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.style.opacity === "0" || window.getComputedStyle(htmlEl).opacity === "0") {
                  htmlEl.style.opacity = "1";
                }
              });
              clonedTarget.style.visibility = "visible";
              clonedTarget.style.opacity = "1";
            }
          },
        });
      } catch (e) { console.error("html2canvas error:", e); return; }
      target.removeAttribute("data-sand-target");
      // Keep the real element hidden until the sand finishes forming.
      target.style.visibility = "hidden";

      const sctx = snap.getContext("2d");
      if (!sctx) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaleX = vw / snap.width;
      const scaleY = vh / snap.height;
      const img = sctx.getImageData(0, 0, snap.width, snap.height).data;

      const particles: AssembleParticle[] = [];
      // console.log("Assemble capturing. Snap size:", snap.width, snap.height);
      for (let sy = 0; sy < snap.height; sy += SAMPLE_STEP) {
        for (let sx = 0; sx < snap.width; sx += SAMPLE_STEP) {
          const idx = (sy * snap.width + sx) * 4;
          const a = img[idx + 3];
          if (a < 24) continue;

          const endX = sx * scaleX;
          const endY = sy * scaleY;

          particles.push({
            endX,
            endY,
            startX: endX + WIND_OFFSET_X - Math.random() * 400,
            startY: endY + WIND_OFFSET_Y + (Math.random() - 0.5) * 400,
            size: Math.max(1, SAMPLE_STEP * scaleX),
            r: img[idx],
            g: img[idx + 1],
            b: img[idx + 2],
            a: a / 255,
            delay: (sx / snap.width) * 420 + Math.random() * 120,
          });
        }
      }
      particlesRef.current = particles;
      // console.log("Assemble particles generated:", particles.length);
    })();
    prepPromiseRef.current = promise;
    return promise;
  }, []);

  const revealTarget = () => {
    if (targetRef.current) targetRef.current.style.visibility = "visible";
  };

  const run = useCallback(async (): Promise<void> => {
    // Make sure the capture (started during the dissolve) is finished.
    if (prepPromiseRef.current) await prepPromiseRef.current;

    const canvas = canvasRef.current;
    const particles = particlesRef.current;
    if (!canvas || particles.length === 0) {
      revealTarget();
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      revealTarget();
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);

    await new Promise<void>((resolve) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const elapsed = now - t0;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        let animating = 0;
        for (const p of particles) {
          const local = elapsed - p.delay;
          if (local <= 0) {
            animating++;
            continue;
          }
          const life = Math.min(1, local / (DURATION - p.delay));
          if (life < 1) {
            animating++;
            const ease = easeOutQuart(life);
            const currX = p.startX + (p.endX - p.startX) * ease;
            const turbulence = Math.sin(life * Math.PI * 2) * 20 * (1 - ease);
            const currY = p.startY + (p.endY - p.startY) * ease + turbulence;
            ctx.globalAlpha = p.a * ease; // fade in as it approaches
            ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
            ctx.fillRect(currX, currY, p.size, p.size);
          } else {
            ctx.globalAlpha = p.a;
            ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
            ctx.fillRect(p.endX, p.endY, p.size, p.size);
          }
        }
        ctx.globalAlpha = 1;

        if (animating > 0 && elapsed < DURATION + 400) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          revealTarget();
          particlesRef.current = [];
          prepPromiseRef.current = null;
          resolve();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  const cancel = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  return { canvasRef, prepare, run, cancel };
}
