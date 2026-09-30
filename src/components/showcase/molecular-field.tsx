'use client';

import { useEffect, useRef } from 'react';

/**
 * The molecular field behind the hero: drifting particles, a faint proximity
 * network, and a few peptide chains — beads on a flexible backbone — floating
 * at different depths and leaning away from the pointer.
 *
 * Canvas 2D, not WebGL. At this density a 2D context is well inside a phone's
 * budget and ships no library. It is deliberately frugal:
 *   - device pixel ratio capped (1.5 desktop, 1.25 phone),
 *   - glows are pre-rendered sprites, never shadowBlur,
 *   - the loop stops when the canvas is off screen or the tab is hidden,
 *   - under reduced motion it paints a single still frame.
 */

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  r: number;
  hue: 0 | 1 | 2;
}

interface Chain {
  x: number;
  y: number;
  z: number;
  angle: number;
  spin: number;
  vx: number;
  vy: number;
  beads: number;
  spacing: number;
  phase: number;
  hues: (0 | 1 | 2)[];
  sideChains: boolean[];
}

const COLORS = ['34,211,238', '99,102,241', '139,124,246'] as const;

function makeSprite(rgb: string, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (g === null) return c;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(236,254,255,1)`);
  grad.addColorStop(0.18, `rgba(${rgb},0.9)`);
  grad.addColorStop(0.45, `rgba(${rgb},0.25)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Small deterministic PRNG so the first frame is the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function MolecularField({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (canvas === null) return;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 767px)').matches;
    const dprCap = small ? 1.25 : 1.5;
    const sprites = COLORS.map((c) => makeSprite(c, 64));
    const rand = rng(7);

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let chains: Chain[] = [];

    // Pointer, eased: the field leans, it does not snap.
    let targetX = 0;
    let targetY = 0;
    let px = 0;
    let py = 0;

    function build() {
      const count = small ? 38 : 88;
      particles = Array.from({ length: count }, () => ({
        x: rand() * width,
        y: rand() * height,
        z: 0.25 + rand() * 0.75,
        vx: (rand() - 0.5) * 0.12,
        vy: (rand() - 0.5) * 0.1 - 0.03,
        r: 0.6 + rand() * 1.6,
        hue: (rand() < 0.62 ? 0 : rand() < 0.6 ? 1 : 2),
      }));
      const chainCount = small ? 3 : 5;
      chains = Array.from({ length: chainCount }, (_, i) => {
        const beads = 6 + Math.floor(rand() * 6);
        return {
          x: (0.1 + (i / chainCount) * 0.85 + rand() * 0.08) * width,
          y: (0.15 + rand() * 0.7) * height,
          z: 0.35 + rand() * 0.65,
          angle: rand() * Math.PI * 2,
          spin: (rand() - 0.5) * 0.0009,
          vx: (rand() - 0.5) * 0.08,
          vy: (rand() - 0.5) * 0.06,
          beads,
          spacing: 16 + rand() * 8,
          phase: rand() * Math.PI * 2,
          hues: Array.from({ length: beads }, () => (rand() < 0.55 ? 0 : rand() < 0.5 ? 1 : 2)),
          sideChains: Array.from({ length: beads }, () => rand() < 0.4),
        };
      });
    }

    function resize() {
      if (canvas === null || ctx === null) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const first = width === 0;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (first) build();
    }

    function wrap(p: { x: number; y: number }, margin: number) {
      if (p.x < -margin) p.x = width + margin;
      else if (p.x > width + margin) p.x = -margin;
      if (p.y < -margin) p.y = height + margin;
      else if (p.y > height + margin) p.y = -margin;
    }

    function draw(t: number) {
      if (ctx === null) return;
      ctx.clearRect(0, 0, width, height);
      px += (targetX - px) * 0.04;
      py += (targetY - py) * 0.04;

      // Particles and their proximity network.
      const pts: [number, number, number][] = [];
      for (const p of particles) {
        if (!reduced) {
          p.x += p.vx * p.z;
          p.y += p.vy * p.z;
          wrap(p, 20);
        }
        const x = p.x + px * 26 * p.z;
        const y = p.y + py * 18 * p.z;
        pts.push([x, y, p.z]);
      }

      ctx.lineWidth = 0.6;
      const link = small ? 90 : 120;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        if (a === undefined) continue;
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          if (b === undefined) continue;
          const dx = a[0] - b[0];
          const dy = a[1] - b[1];
          const d2 = dx * dx + dy * dy;
          if (d2 < link * link) {
            const alpha = (1 - Math.sqrt(d2) / link) * 0.16 * Math.min(a[2], b[2]);
            ctx.strokeStyle = `rgba(125,211,252,${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.stroke();
          }
        }
      }

      particles.forEach((p, i) => {
        const pt = pts[i];
        const sprite = sprites[p.hue];
        if (pt === undefined || sprite === undefined) return;
        const s = p.r * 7 * p.z;
        ctx.globalAlpha = 0.35 + p.z * 0.55;
        ctx.drawImage(sprite, pt[0] - s / 2, pt[1] - s / 2, s, s);
      });
      ctx.globalAlpha = 1;

      // Peptide chains.
      for (const c of chains) {
        if (!reduced) {
          c.x += c.vx;
          c.y += c.vy;
          c.angle += c.spin;
          wrap(c, 200);
        }
        const time = t * 0.0006 + c.phase;
        const cx = c.x + px * 48 * c.z;
        const cy = c.y + py * 32 * c.z;
        const cos = Math.cos(c.angle);
        const sin = Math.sin(c.angle);
        const beads: [number, number][] = [];
        for (let k = 0; k < c.beads; k++) {
          const u = (k - (c.beads - 1) / 2) * c.spacing * c.z;
          const v = Math.sin(k * 0.9 + time) * 10 * c.z;
          beads.push([cx + u * cos - v * sin, cy + u * sin + v * cos]);
        }

        // Backbone.
        ctx.strokeStyle = `rgba(165,243,252,${(0.12 + c.z * 0.22).toFixed(3)})`;
        ctx.lineWidth = 1.1 * c.z;
        ctx.beginPath();
        beads.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();

        // Side chains, alternating sides of the backbone.
        beads.forEach(([x, y], k) => {
          if (!c.sideChains[k]) return;
          const side = k % 2 === 0 ? 1 : -1;
          const len = 13 * c.z;
          const sx = x - sin * len * side;
          const sy = y + cos * len * side;
          ctx.strokeStyle = `rgba(165,243,252,${(0.08 + c.z * 0.14).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(sx, sy);
          ctx.stroke();
          const spr = sprites[2];
          if (spr !== undefined) {
            const s = 9 * c.z;
            ctx.globalAlpha = 0.5 * c.z;
            ctx.drawImage(spr, sx - s / 2, sy - s / 2, s, s);
            ctx.globalAlpha = 1;
          }
        });

        beads.forEach(([x, y], k) => {
          const spr = sprites[c.hues[k] ?? 0];
          if (spr === undefined) return;
          const s = (16 + (k % 3) * 3) * c.z;
          ctx.globalAlpha = 0.45 + c.z * 0.5;
          ctx.drawImage(spr, x - s / 2, y - s / 2, s, s);
        });
        ctx.globalAlpha = 1;
      }
    }

    let frame = 0;
    let running = false;
    let visible = true;

    function loop(t: number) {
      draw(t);
      frame = requestAnimationFrame(loop);
    }
    function start() {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(frame);
    }

    resize();
    draw(0);
    start();

    const ro = new ResizeObserver(() => {
      resize();
      if (!running) draw(performance.now());
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
