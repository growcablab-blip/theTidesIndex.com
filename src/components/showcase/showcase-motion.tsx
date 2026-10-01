'use client';

import { useEffect } from 'react';

/**
 * One small script drives every non-canvas motion on the holding experience,
 * so the page has a single client boundary for behaviour instead of dozens:
 *
 *   [data-reveal]   fades and rises in once it enters the viewport
 *   [data-count]    counts up to its server-rendered value when revealed
 *   [data-scan]     a looping decorative scan readout (00–99)
 *   [data-parallax] drifts with the page by up to N px (rendered scenes)
 *   .sx root        gets data-scrolled once the page leaves the top
 *
 * Everything it animates is already present and correct in the server HTML.
 * Without JavaScript, or under reduced motion, the page is simply complete.
 */
export function ShowcaseMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.sx');
    if (root === null) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // `data-motion` is set on the root by the layout's inline script before
    // paint. It is deliberately not set here: after a client-side navigation
    // the sections are simply shown, rather than hidden and flashed back in.

    // --- Reveal and count --------------------------------------------------
    const countUp = (el: HTMLElement) => {
      const target = Number(el.dataset.count);
      if (!Number.isFinite(target) || reduced) return;
      const duration = 1800;
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(target * eased).toLocaleString('en-US');
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.shown = '';
          el.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

    // --- Header state ------------------------------------------------------
    const onScroll = () => {
      if (window.scrollY > 40) root.dataset.scrolled = '';
      else delete root.dataset.scrolled;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // --- Parallax on rendered scenes -----------------------------------------
    // One rAF per scroll, only for elements on screen; transforms only.
    const layers = reduced ? [] : Array.from(root.querySelectorAll<HTMLElement>('[data-parallax]'));
    let parallaxFrame = 0;
    const drift = () => {
      parallaxFrame = 0;
      const vh = window.innerHeight;
      for (const el of layers) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) continue;
        const k = (r.top + r.height / 2 - vh / 2) / vh;
        const amount = Number(el.dataset.parallax) || 30;
        el.style.transform = `translate3d(0, ${(k * -amount).toFixed(1)}px, 0)`;
      }
    };
    const onParallax = () => {
      if (parallaxFrame === 0) parallaxFrame = requestAnimationFrame(drift);
    };
    if (layers.length > 0) {
      drift();
      window.addEventListener('scroll', onParallax, { passive: true });
    }

    // --- Decorative scan readouts -----------------------------------------
    const scans = Array.from(root.querySelectorAll<HTMLElement>('[data-scan]'));
    let n = 0;
    const scanTimer = reduced
      ? 0
      : window.setInterval(() => {
          n = (n + 1) % 100;
          scans.forEach((el, i) => {
            el.textContent = String((n + i * 37) % 100).padStart(2, '0');
          });
        }, 120);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onParallax);
      cancelAnimationFrame(parallaxFrame);
      window.clearInterval(scanTimer);
    };
  }, []);

  return null;
}
