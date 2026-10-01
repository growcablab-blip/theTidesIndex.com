/**
 * The research figure's structures, and the targets of the hero's particle story.
 * Pure TypeScript, no three.js: unit-testable, and never loaded on the static tier.
 *
 * The figure itself is a real human mesh (the CC0 MakeHuman base mesh, re-posed
 * — see `assets/hero/README.md`), delivered as `public/hero/figure.bin`. This
 * module samples its point cloud from that mesh and lays the neural and vascular
 * networks along the mesh's own joints (`figure-landmarks.ts`).
 *
 * Units: 10 tall, feet at y = −5, facing +z. Everything is seeded, so every
 * visitor, screenshot and test sees the same figure.
 *
 * The networks, heart and neural cluster are an illustration of "human systems",
 * not anatomy: no path is claimed to be a particular nerve or vessel.
 */
import { LANDMARKS as L, type Point } from './figure-landmarks';
import { FIGURE_BOUNDS, isInside } from './figure-format';

// ---------------------------------------------------------------------------
// Random numbers and cooperative work
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sampling tens of thousands of points is real CPU on a phone. The samplers are
 * generators that yield regularly, so the caller can spread the work across
 * frames and never block the page.
 */
export type Work<T> = Generator<undefined, T, undefined>;

/** Run a generator to completion synchronously (tests, scripts). */
export function runNow<T>(work: Work<T>): T {
  for (;;) {
    const step = work.next();
    if (step.done === true) return step.value;
  }
}

// ---------------------------------------------------------------------------
// Landmarks the choreography uses
// ---------------------------------------------------------------------------

export const HEART: Point = L.heart;
export const BRAIN: Point = L.brain;

// ---------------------------------------------------------------------------
// The figure's point cloud, from the mesh
// ---------------------------------------------------------------------------

/** The decoded mesh, in body units. */
export interface FigureMesh {
  readonly position: Float32Array;
  readonly normal: Float32Array;
  readonly index: Uint16Array;
  readonly grid: readonly [number, number, number];
  readonly occupancy: Uint8Array;
}

export const PARTICLE_KIND = { surface: 0, interior: 1, brain: 2 } as const;

export interface FigureParticles {
  readonly count: number;
  readonly position: Float32Array;
  readonly normal: Float32Array;
  /** 0 surface · 1 interior haze · 2 neural cluster in the head */
  readonly kind: Float32Array;
  readonly rand: Float32Array;
}

export function* sampleFigure(
  mesh: FigureMesh,
  counts: { surface: number; interior: number; brain: number },
  seed = 1729,
): Work<FigureParticles> {
  const rand = mulberry32(seed);
  const total = counts.surface + counts.interior + counts.brain;
  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const kind = new Float32Array(total);
  const rnd = new Float32Array(total * 4);
  const P = mesh.position;
  const N = mesh.normal;
  const I = mesh.index;

  // Area-weighted triangle choice: an even skin whatever the mesh density.
  const triCount = I.length / 3;
  const cdf = new Float64Array(triCount);
  let area = 0;
  for (let t = 0; t < triCount; t++) {
    const a = I[t * 3]! * 3;
    const b = I[t * 3 + 1]! * 3;
    const c = I[t * 3 + 2]! * 3;
    const ux = P[b]! - P[a]!;
    const uy = P[b + 1]! - P[a + 1]!;
    const uz = P[b + 2]! - P[a + 2]!;
    const vx = P[c]! - P[a]!;
    const vy = P[c + 1]! - P[a + 1]!;
    const vz = P[c + 2]! - P[a + 2]!;
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    area += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    cdf[t] = area;
  }
  yield;

  let i = 0;
  const finish = (k: number) => {
    kind[i] = k;
    for (let r = 0; r < 4; r++) rnd[i * 4 + r] = rand();
    i++;
  };

  while (i < counts.surface) {
    const target = rand() * area;
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid]! < target) lo = mid + 1;
      else hi = mid;
    }
    let u = rand();
    let v = rand();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    const a = I[lo * 3]! * 3;
    const b = I[lo * 3 + 1]! * 3;
    const c = I[lo * 3 + 2]! * 3;
    for (let k = 0; k < 3; k++) {
      position[i * 3 + k] = P[a + k]! * w + P[b + k]! * u + P[c + k]! * v;
      normal[i * 3 + k] = N[a + k]! * w + N[b + k]! * u + N[c + k]! * v;
    }
    finish(PARTICLE_KIND.surface);
    if (i % 4000 === 0) yield;
  }

  // Interior haze: random points the occupancy grid calls inside.
  const { min, max } = FIGURE_BOUNDS;
  let guard = 0;
  while (i < counts.surface + counts.interior && guard++ < counts.interior * 200) {
    const x = min[0] + (max[0] - min[0]) * rand();
    const y = min[1] + (max[1] - min[1]) * rand();
    const z = min[2] + (max[2] - min[2]) * rand();
    if (!isInside(mesh, x, y, z)) continue;
    position.set([x, y, z], i * 3);
    finish(PARTICLE_KIND.interior);
  }
  yield;

  // Neural cluster: a denser cloud in the upper head, weighted toward its shell.
  while (i < total) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = Math.pow(rand(), 0.35);
    position.set([BRAIN[0] + s * Math.cos(th) * 0.3 * r, BRAIN[1] + u * 0.3 * r, BRAIN[2] + s * Math.sin(th) * 0.34 * r], i * 3);
    normal.set([s * Math.cos(th), u, s * Math.sin(th)], i * 3);
    finish(PARTICLE_KIND.brain);
  }

  return { count: i, position, normal, kind, rand: rnd };
}

// ---------------------------------------------------------------------------
// Networks: neural and vascular paths, laid along the mesh's joints
// ---------------------------------------------------------------------------

type P3 = readonly [number, number, number];
type Path = readonly P3[];

export const NETWORK_KIND = { neural: 0, vascular: 1 } as const;

const at = (p: Point, dx = 0, dy = 0, dz = 0): P3 => [p[0] + dx, p[1] + dy, p[2] + dz];
const lerp3 = (a: Point, b: Point, t: number): P3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const SIDES = [
  { s: 1, clav: L.lClavicle, sh: L.lShoulder, el: L.lElbow, hand: L.lHand, tip: L.lHandTip, hip: L.lHip, knee: L.lKnee, ankle: L.lAnkle, toe: L.lToe },
  { s: -1, clav: L.rClavicle, sh: L.rShoulder, el: L.rElbow, hand: L.rHand, tip: L.rHandTip, hip: L.rHip, knee: L.rKnee, ankle: L.rAnkle, toe: L.rToe },
] as const;

const NEURAL: Path[] = [
  // brain, brainstem and spinal cord
  [at(BRAIN), at(L.head, 0, -0.15, -0.05), at(L.neck, 0, 0, -0.05), at(L.spine1, 0, 0, -0.05), at(L.spine2), at(L.spine3), at(L.spine4), at(L.pelvis, 0, -0.05)],
  ...SIDES.flatMap(({ s, clav, sh, el, hand, tip, hip, knee, ankle, toe }): Path[] => [
    // to the hands
    [at(L.spine1, 0, 0.05, -0.05), lerp3(L.spine1, clav, 0.6), at(sh), at(el), at(hand), lerp3(hand, tip, 0.8)],
    // to the feet
    [at(L.pelvis, 0, -0.05), at(hip, 0, -0.1), at(knee), at(ankle), lerp3(ankle, toe, 0.8)],
    // short diagonals off the cord, like ribs rather than hoops
    ...[0.2, 0.55].map((t): Path => {
      const o = lerp3(L.spine1, L.spine2, t);
      return [o, at(o, s * 0.35, -0.12, 0.05), at(o, s * 0.62, -0.34, 0.22)];
    }),
  ]),
];

const VASCULAR: Path[] = [
  // aortic arch and descending aorta
  [at(HEART), at(L.spine1, 0.08, 0.22, 0.12), at(L.spine1, -0.08, 0.12, 0.02), at(L.spine2, -0.05, 0, 0.05), at(L.spine3, -0.03, 0, 0.08), at(L.spine4, 0, 0, 0.08), at(L.pelvis, 0, 0, 0.08)],
  ...SIDES.flatMap(({ s, clav, sh, el, hand, tip, hip, knee, ankle, toe }): Path[] => [
    // to the feet
    [at(L.pelvis, 0, 0, 0.08), at(hip, -s * 0.05, -0.12, 0.08), at(knee, -s * 0.04, 0, 0.06), at(ankle, 0, 0, 0.05), lerp3(ankle, toe, 0.75)],
    // up the neck
    [at(L.spine1, 0, 0.3, 0.1), at(L.neck, s * 0.1, 0, 0.1), at(L.head, s * 0.14, -0.2, 0.1)],
    // to the hands
    [at(L.spine1, 0.02, 0.22, 0.08), at(clav, 0, 0, -0.02), at(sh, 0, -0.05, 0.06), at(el, 0, 0, 0.06), at(hand, 0, 0, 0.02), lerp3(hand, tip, 0.6)],
    // torso branches from the heart
    [at(HEART), at(HEART, s * 0.42, -0.3, 0.12), at(HEART, s * 0.5, -1.0, 0.1), at(HEART, s * 0.3, -1.65, 0.12)],
  ]),
];

/** Uniform Catmull–Rom through the control points, `per` samples per span. */
function smooth(path: Path, per: number): P3[] {
  const out: P3[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[Math.max(0, i - 1)]!;
    const p1 = path[i]!;
    const p2 = path[i + 1]!;
    const p3 = path[Math.min(path.length - 1, i + 2)]!;
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]);
    }
  }
  out.push(path[path.length - 1]!);
  return out;
}

export interface Network {
  /** Line segments: two vertices per segment. */
  readonly position: Float32Array;
  /** Distance from the system's origin (brain or heart), normalised 0..1 across the body. */
  readonly dist: Float32Array;
  readonly kind: Float32Array;
  readonly seed: Float32Array;
  /** Dense points along the paths, for particles to settle on. */
  readonly samples: readonly (readonly [number, number, number, number])[];
}

/** Longest origin-to-point distance the signal has to travel, for normalising. */
export const NETWORK_REACH = 10;

export function buildNetwork(): Network {
  const verts: number[] = [];
  const dist: number[] = [];
  const kind: number[] = [];
  const seed: number[] = [];
  const samples: [number, number, number, number][] = [];
  const rand = mulberry32(31);
  const add = (paths: Path[], k: number, origin: P3) => {
    for (const path of paths) {
      const pts = smooth(path, 10);
      const s = rand();
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        for (const p of [a, b]) {
          verts.push(p[0], p[1], p[2]);
          const dx = p[0] - origin[0];
          const dy = p[1] - origin[1];
          const dz = p[2] - origin[2];
          dist.push(Math.sqrt(dx * dx + dy * dy + dz * dz) / NETWORK_REACH);
          kind.push(k);
          seed.push(s);
        }
        samples.push([a[0], a[1], a[2], k]);
      }
    }
  };
  add(NEURAL, NETWORK_KIND.neural, BRAIN);
  add(VASCULAR, NETWORK_KIND.vascular, HEART);
  return { position: new Float32Array(verts), dist: new Float32Array(dist), kind: new Float32Array(kind), seed: new Float32Array(seed), samples };
}

/** Short random links between points of the neural cluster — the head's own network. */
export function buildBrainLinks(count: number, seed = 97): Float32Array {
  const rand = mulberry32(seed);
  const nodes: [number, number, number][] = [];
  for (let i = 0; i < 70; i++) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 0.55 + 0.45 * rand();
    nodes.push([BRAIN[0] + s * Math.cos(th) * 0.28 * r, BRAIN[1] + u * 0.28 * r, BRAIN[2] + s * Math.sin(th) * 0.32 * r]);
  }
  const out: number[] = [];
  let made = 0;
  for (let i = 0; i < nodes.length && made < count; i++) {
    const a = nodes[i]!;
    for (let j = i + 1; j < nodes.length && made < count; j++) {
      const b = nodes[j]!;
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const dz = a[2] - b[2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.24) {
        out.push(...a, ...b);
        made++;
      }
    }
  }
  return new Float32Array(out);
}

// ---------------------------------------------------------------------------
// Story targets: peptide → membrane and receptors → the body's networks
// ---------------------------------------------------------------------------

export interface StoryTargets {
  readonly count: number;
  /** Peptide helix, in its own frame (axis = y, centred on the origin). */
  readonly helix: Float32Array;
  readonly helixColor: Float32Array;
  /** Membrane patch with receptors, in its own frame (normal = +z). */
  readonly membrane: Float32Array;
  readonly membraneColor: Float32Array;
  /** Points on the body's networks, body-local. */
  readonly network: Float32Array;
  readonly networkColor: Float32Array;
  readonly rand: Float32Array;
}

const ICE: P3 = [0.78, 0.95, 1.0];
const CYAN: P3 = [0.13, 0.83, 0.93];
const BLUE: P3 = [0.23, 0.51, 0.96];
const INDIGO: P3 = [0.39, 0.4, 0.95];
const VIOLET: P3 = [0.55, 0.49, 0.96];

/**
 * A generic α-helix: 16 residues, 3.6 per turn — the textbook geometry, not the
 * structure of any particular compound. Backbone, atoms and side chains.
 */
function helixPoint(rand: () => number, out: Float32Array, col: Float32Array, i3: number) {
  const residues = 16;
  const radius = 0.37;
  const rise = 0.24;
  const turn = (100 * Math.PI) / 180;
  const len = residues * rise;
  const r = rand();
  const put = (x: number, y: number, z: number, c: P3) => {
    out[i3] = x;
    out[i3 + 1] = y - len / 2;
    out[i3 + 2] = z;
    col[i3] = c[0];
    col[i3 + 1] = c[1];
    col[i3 + 2] = c[2];
  };
  const jitter = (s: number) => (rand() - 0.5) * s;
  if (r < 0.42) {
    // backbone tube
    const t = rand() * residues;
    const a = t * turn;
    put(Math.cos(a) * radius + jitter(0.06), t * rise + jitter(0.06), Math.sin(a) * radius + jitter(0.06), rand() < 0.45 ? ICE : rand() < 0.6 ? CYAN : BLUE);
  } else if (r < 0.75) {
    // backbone atoms: three per residue
    const i = Math.floor(rand() * residues * 3);
    const t = i / 3;
    const a = t * turn;
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const ar = 0.085 * Math.cbrt(rand());
    put(Math.cos(a) * radius + s * Math.cos(th) * ar, t * rise + u * ar, Math.sin(a) * radius + s * Math.sin(th) * ar, i % 3 === 1 ? CYAN : ICE);
  } else {
    // side chains, projecting outward from each residue
    const i = Math.floor(rand() * residues);
    const a = i * turn;
    const reach = 0.3 + 0.2 * ((i * 7) % 5) / 4;
    const along = rand();
    const blob = along > 0.72;
    const d = radius + reach * (blob ? 1 : along / 0.72);
    const br = blob ? 0.11 * Math.cbrt(rand()) : 0.02;
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    put(Math.cos(a) * d + s * Math.cos(th) * br, i * rise + u * br, Math.sin(a) * d + s * Math.sin(th) * br, i % 4 === 0 ? VIOLET : i % 4 === 2 ? BLUE : CYAN);
  }
}

/** A curved bilayer patch with transmembrane receptors and docked ligands. */
const RECEPTORS: readonly [number, number][] = [
  [-1.45, 0.55], [-0.6, -0.45], [0.25, 0.6], [1.1, -0.2], [1.75, 0.75], [-1.2, -0.9], [0.7, -1.0],
];

function membranePoint(rand: () => number, out: Float32Array, col: Float32Array, i3: number) {
  const curve = (x: number, y: number) => -0.12 * (x * x + y * y * 0.6);
  const put = (x: number, y: number, z: number, c: P3) => {
    out[i3] = x;
    out[i3 + 1] = y;
    out[i3 + 2] = z;
    col[i3] = c[0];
    col[i3 + 1] = c[1];
    col[i3 + 2] = c[2];
  };
  const r = rand();
  if (r < 0.62) {
    // two leaflets of lipid heads, packed on a jittered lattice so the membrane
    // reads as a sheet rather than a cloud
    const x = (Math.floor(rand() * 52) / 51 - 0.5) * 4.6 + (rand() - 0.5) * 0.02;
    const y = (Math.floor(rand() * 34) / 33 - 0.5) * 3.0 + (rand() - 0.5) * 0.02;
    const leaf = rand() < 0.5 ? -1 : 1;
    const z = curve(x, y) + leaf * 0.11 + (rand() - 0.5) * 0.01;
    put(x, y, z, leaf > 0 ? BLUE : INDIGO);
  } else if (r < 0.88) {
    // receptors: seven-helix bundles through the membrane, opening above it
    const rc = RECEPTORS[Math.floor(rand() * RECEPTORS.length)]!;
    const h = Math.floor(rand() * 7);
    const a = (h / 7) * Math.PI * 2;
    const t = rand();
    const z = -0.35 + t * 0.95;
    const flare = 0.14 + Math.max(0, z - 0.2) * 0.35;
    const x = rc[0] + Math.cos(a + t * 0.8) * flare + (rand() - 0.5) * 0.03;
    const y = rc[1] + Math.sin(a + t * 0.8) * flare + (rand() - 0.5) * 0.03;
    put(x, y, curve(rc[0], rc[1]) + z, t > 0.7 ? CYAN : VIOLET);
  } else {
    // ligands docked in the receptors' openings
    const rc = RECEPTORS[Math.floor(rand() * RECEPTORS.length)]!;
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const lr = 0.12 * Math.cbrt(rand());
    put(rc[0] + s * Math.cos(th) * lr, rc[1] + u * lr, curve(rc[0], rc[1]) + 0.68 + s * Math.sin(th) * lr, ICE);
  }
}

export function* buildStory(count: number, network: Network, seed = 4099): Work<StoryTargets> {
  const rand = mulberry32(seed);
  const helix = new Float32Array(count * 3);
  const helixColor = new Float32Array(count * 3);
  const membrane = new Float32Array(count * 3);
  const membraneColor = new Float32Array(count * 3);
  const net = new Float32Array(count * 3);
  const netColor = new Float32Array(count * 3);
  const rnd = new Float32Array(count * 4);
  const samples = network.samples;

  for (let i = 0; i < count; i++) {
    helixPoint(rand, helix, helixColor, i * 3);
    membranePoint(rand, membrane, membraneColor, i * 3);

    // Network: mostly along the paths, some gathering at the heart and in the head.
    const r = rand();
    let x: number, y: number, z: number, c: P3;
    if (r < 0.8 && samples.length > 0) {
      const s = samples[Math.floor(rand() * samples.length)]!;
      x = s[0] + (rand() - 0.5) * 0.05;
      y = s[1] + (rand() - 0.5) * 0.05;
      z = s[2] + (rand() - 0.5) * 0.05;
      c = s[3] === NETWORK_KIND.neural ? (rand() < 0.5 ? VIOLET : ICE) : rand() < 0.6 ? CYAN : BLUE;
    } else {
      const atHeart = r < 0.9;
      const o = atHeart ? HEART : BRAIN;
      const rr = (atHeart ? 0.22 : 0.3) * Math.cbrt(rand());
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      x = o[0] + s * Math.cos(th) * rr;
      y = o[1] + u * rr;
      z = o[2] + s * Math.sin(th) * rr;
      c = atHeart ? ICE : VIOLET;
    }
    net[i * 3] = x;
    net[i * 3 + 1] = y;
    net[i * 3 + 2] = z;
    netColor[i * 3] = c[0];
    netColor[i * 3 + 1] = c[1];
    netColor[i * 3 + 2] = c[2];
    for (let k = 0; k < 4; k++) rnd[i * 4 + k] = rand();
    if (i % 2500 === 0) yield;
  }

  return {
    count,
    helix,
    helixColor,
    membrane,
    membraneColor,
    network: net,
    networkColor: netColor,
    rand: rnd,
  };
}

// ---------------------------------------------------------------------------
// The peptide as a solid object: atoms and bonds of the same generic helix
// ---------------------------------------------------------------------------

export const ATOM_KIND = { backbone: 0, alpha: 1, side: 2 } as const;

export interface HelixSolid {
  /** x, y, z, radius, kind — in the helix's own frame, matching `helixPoint`. */
  readonly atoms: readonly (readonly [number, number, number, number, number])[];
  /** Pairs of atom indices. */
  readonly bonds: readonly (readonly [number, number])[];
}

/**
 * The same textbook α-helix the particles form (16 residues, 3.6 per turn),
 * as spheres and bonds, so the solid and the particle skin line up exactly.
 * Generic geometry — not the structure of any named compound.
 */
export function buildHelixSolid(): HelixSolid {
  const residues = 16;
  const radius = 0.37;
  const rise = 0.24;
  const turn = (100 * Math.PI) / 180;
  const half = (residues * rise) / 2;
  const atoms: [number, number, number, number, number][] = [];
  const bonds: [number, number][] = [];
  let prevBackbone = -1;
  for (let i = 0; i < residues * 3; i++) {
    const t = i / 3;
    const a = t * turn;
    const alpha = i % 3 === 1;
    atoms.push([Math.cos(a) * radius, t * rise - half, Math.sin(a) * radius, alpha ? 0.1 : 0.075, alpha ? ATOM_KIND.alpha : ATOM_KIND.backbone]);
    const idx = atoms.length - 1;
    if (prevBackbone >= 0) bonds.push([prevBackbone, idx]);
    prevBackbone = idx;
    if (alpha) {
      const r = Math.floor(t);
      const reach = 0.3 + (0.2 * ((r * 7) % 5)) / 4;
      const ar = r * turn;
      atoms.push([Math.cos(ar) * (radius + reach), r * rise - half, Math.sin(ar) * (radius + reach), 0.1 + 0.03 * ((r * 3) % 3), ATOM_KIND.side]);
      bonds.push([idx, atoms.length - 1]);
    }
  }
  return { atoms, bonds };
}
