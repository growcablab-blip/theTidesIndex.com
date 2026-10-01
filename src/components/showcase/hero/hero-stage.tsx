'use client';

import { useEffect, useRef, useState } from 'react';
import type { HeroEngine, LabelFrame } from './hero-engine';
import { detectTier } from './hero-tier';
import { isShotName, SHOTS } from './hero-shots';

/**
 * The live layer of the hero: decides the tier, drives the engine from scroll,
 * and positions the labels the engine projects.
 *
 * The still (rendered from this same scene) is already on the page underneath.
 * On tier C nothing here mounts and three.js is never requested; on A and B the
 * canvas fades in over the still once its first frame is drawn.
 *
 * Scroll progress is written to the hero as `--hp` (0…1) and `data-phase`, so the
 * copy can respond in CSS without React re-rendering on every scroll event.
 */

/** In the order the engine reports its anchors. `side` is where the card opens. */
const LABELS = [
  { title: 'Peptide structure', detail: 'Sequence · fold', side: 'right' },
  { title: 'Receptor binding', detail: 'Membrane · signal', side: 'right' },
  { title: 'Neural signaling', detail: 'Network response', side: 'right' },
  { title: 'Vascular pathways', detail: 'Circulation', side: 'left' },
  { title: 'Cellular response', detail: 'Tissue activation', side: 'right' },
] as const;

export function HeroStage({ trackId }: { trackId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [live, setLive] = useState<'off' | 'on'>('off');

  useEffect(() => {
    const track = document.getElementById(trackId);
    const canvas = canvasRef.current;
    if (track === null || canvas === null) return;

    const search = new URLSearchParams(window.location.search);
    const tooling = process.env.NODE_ENV !== 'production';
    const shotName = tooling && search.get('hero') === 'shot' ? search.get('name') : null;
    const shot = isShotName(shotName) ? SHOTS[shotName] : undefined;
    const poster = tooling && (search.get('hero') === 'poster' || shot !== undefined);
    // The still is rendered at full density and the display's own resolution.
    // Stills are rendered at full density and the display's own resolution, with
    // a smaller point cap so close compositions keep a crisp skin rather than soft discs.
    const tier = poster ? { ...detectTier('?tier=a'), maxDpr: 3, maxPointPx: 5 } : detectTier(window.location.search);
    track.dataset.tier = tier.tier;
    if (tier.tier === 'c') return;

    let engine: HeroEngine | null = null;
    let cancelled = false;

    const progress = () => {
      const rect = track.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      return Math.min(1, Math.max(0, -rect.top / travel));
    };
    let lastPhase = '';
    const onScroll = () => {
      const p = poster ? 1 : progress();
      track.style.setProperty('--hp', p.toFixed(4));
      const phase = p < 0.3 ? 'peptide' : p < 0.6 ? 'receptor' : 'system';
      if (phase !== lastPhase) {
        track.dataset.phase = phase;
        lastPhase = phase;
      }
      engine?.setProgress(p);
    };

    const onFrame = (labels: readonly LabelFrame[]) => {
      labels.forEach((l, i) => {
        const el = labelRefs.current[i];
        if (!el) return;
        el.style.opacity = l.alpha.toFixed(3);
        el.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0)`;
      });
    };

    void import('./hero-engine').then(({ HeroEngine }) => {
      if (cancelled) return;
      engine = new HeroEngine(canvas, {
        tier,
        poster,
        shot,
        onReady: () => {
          if (cancelled) return;
          setLive('on');
          if (poster) {
            window.setTimeout(() => {
              (window as Window & { __heroPosterReady?: boolean }).__heroPosterReady = true;
            }, 2500);
          }
        },
        onFrame: poster ? undefined : onFrame,
        onContextLost: () => {
          track.dataset.tier = 'c';
          setLive('off');
        },
      });
      onScroll();
      if (process.env.NODE_ENV !== 'production') {
        (window as Window & { __hero?: HeroEngine }).__hero = engine;
      }
    });

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelled = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      engine?.dispose();
    };
  }, [trackId]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="sx-hero-gl"
        data-live={live}
      />
      <div className="sx-hero-labels" aria-hidden="true" data-live={live}>
        {LABELS.map((l, i) => (
          <div
            key={l.title}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="sx-hero-label"
            data-side={l.side}
            style={{ opacity: 0 }}
          >
            <span className="sx-hero-label-line" />
            <div className="sx-hero-label-card">
              <p>
                <span className="sx-hud-dot" />
                {l.title}
              </p>
              <p className="mt-1 text-[var(--sx-faint)]">{l.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
