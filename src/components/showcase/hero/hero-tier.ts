/**
 * Rendering tiers for the hero.
 *
 *   A — full scene: desktop-class device.
 *   B — reduced: touch or small screens, low memory or cores, or an integrated
 *       GPU driving a large canvas. About half the particles, capped DPR.
 *   C — no canvas: reduced motion, no WebGL2, or an explicit request. The hero
 *       shows its still (a frame rendered from this same scene) and three.js is
 *       never downloaded.
 *
 * The tier is a starting point, not a verdict: the engine keeps measuring and
 * steps its own quality down if the device cannot hold the frame rate.
 * `?tier=a|b|c` overrides detection, so each tier can be reviewed.
 */

export type Tier = 'a' | 'b' | 'c';

export interface TierBudget {
  readonly tier: Tier;
  readonly reason: string;
  readonly surface: number;
  readonly interior: number;
  readonly brain: number;
  readonly story: number;
  readonly motes: number;
  readonly maxDpr: number;
  /** Largest point sprite, in CSS pixels. Fill rate, not vertex count, is what small GPUs run out of. */
  readonly maxPointPx: number;
}

const BUDGET: Record<Tier, Omit<TierBudget, 'tier' | 'reason'>> = {
  a: { surface: 22000, interior: 4000, brain: 2000, story: 14000, motes: 70, maxDpr: 1.75, maxPointPx: 26 },
  b: { surface: 11000, interior: 2000, brain: 1200, story: 6000, motes: 30, maxDpr: 1.5, maxPointPx: 16 },
  c: { surface: 0, interior: 0, brain: 0, story: 0, motes: 0, maxDpr: 1, maxPointPx: 0 },
};

function webgl2(): WebGL2RenderingContext | null {
  try {
    return document.createElement('canvas').getContext('webgl2');
  } catch {
    return null;
  }
}

/**
 * Integrated graphics driving a large canvas is the one desktop case that cannot
 * hold tier A: the cores and memory of a desktop with the fill rate of a phone.
 */
function integratedGpuAtHighRes(gl: WebGL2RenderingContext): boolean {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    const integrated = /Intel\(R\) (U?HD|Iris(?!.{0,6}Xe))|Mali|Adreno .{0,5}[1-5]\d\d|PowerVR|SwiftShader|llvmpipe/i.test(name);
    const pixels = window.innerWidth * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2) ** 2;
    return integrated && pixels > 1_500_000;
  } catch {
    return false;
  }
}

export function detectTier(search: string = window.location.search): TierBudget {
  const make = (tier: Tier, reason: string): TierBudget => ({ tier, reason, ...BUDGET[tier] });
  const forced = new URLSearchParams(search).get('tier')?.toLowerCase();
  if (forced === 'a' || forced === 'b' || forced === 'c') return make(forced, 'forced by ?tier');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return make('c', 'prefers-reduced-motion');
  const gl = webgl2();
  if (gl === null) return make('c', 'WebGL2 unavailable');

  const nav = navigator as Navigator & { deviceMemory?: number };
  if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820) return make('b', 'touch or small viewport');
  if ((nav.deviceMemory ?? 8) <= 4) return make('b', 'device memory ≤ 4 GB');
  if ((nav.hardwareConcurrency ?? 8) <= 4) return make('b', '≤ 4 logical cores');
  if (integratedGpuAtHighRes(gl)) return { ...make('b', 'integrated GPU at high resolution'), maxDpr: 0.9 };
  return make('a', 'desktop-class device');
}
