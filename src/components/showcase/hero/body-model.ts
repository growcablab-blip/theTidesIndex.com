/**
 * The research figure's geometry — a stylized human body and the structures the
 * hero's particle story moves through. Pure TypeScript, no three.js, so it can
 * be unit-tested and so the static tier never has to load a renderer.
 *
 * Units: the figure stands 10 units tall, feet at y ≈ −5, crown at y ≈ 4.95,
 * facing +z. Everything is deterministic (seeded), so every visitor, every
 * screenshot and every test sees the same body.
 *
 * The body is a signed distance field: tapered capsules and ellipsoids joined
 * with smooth minimums. It is deliberately not anatomy — no organ is claimed and
 * no proportion is clinical. Silhouette and depth are the point.
 */

// ---------------------------------------------------------------------------
// Random numbers
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

// ---------------------------------------------------------------------------
// The body as a distance field
// ---------------------------------------------------------------------------

type Ellipsoid = { kind: 'e'; c: readonly [number, number, number]; r: readonly [number, number, number]; k: number };
type Cone = {
  kind: 'c';
  a: readonly [number, number, number];
  b: readonly [number, number, number];
  ra: number;
  rb: number;
  k: number;
};
type Part = Ellipsoid | Cone;

const e = (c: Ellipsoid['c'], r: Ellipsoid['r'], k: number): Ellipsoid => ({ kind: 'e', c, r, k });
const cone = (a: Cone['a'], b: Cone['b'], ra: number, rb: number, k: number): Cone => ({ kind: 'c', a, b, ra, rb, k });

function mirrored(make: (s: number) => Part[]): Part[] {
  return [...make(-1), ...make(1)];
}

/** The first part is the seed of the union; each later part joins with its own blend radius. */
const PARTS: readonly Part[] = [
  // torso
  e([0, 2.4, 0.02], [1.0, 1.0, 0.6], 0),
  e([0, 1.65, 0.04], [0.88, 0.75, 0.54], 0.35),
  e([0, 0.95, 0.06], [0.78, 0.75, 0.5], 0.35),
  e([0, 0.15, 0], [0.9, 0.62, 0.55], 0.35),
  cone([-0.9, 3.0, -0.02], [0.9, 3.0, -0.02], 0.33, 0.33, 0.35),
  // neck and head
  cone([0, 3.2, -0.03], [0, 3.85, 0.02], 0.25, 0.23, 0.25),
  e([0, 4.3, 0.04], [0.49, 0.63, 0.56], 0.16),
  e([0, 3.95, 0.14], [0.37, 0.34, 0.4], 0.2),
  // arms
  ...mirrored((s) => [
    e([s * 1.02, 2.9, 0], [0.35, 0.42, 0.35], 0.2),
    cone([s * 1.08, 2.82, 0], [s * 1.46, 1.4, 0.02], 0.27, 0.21, 0.15),
    cone([s * 1.46, 1.4, 0.02], [s * 1.74, 0.05, 0.18], 0.21, 0.14, 0.1),
    e([s * 1.82, -0.42, 0.22], [0.13, 0.33, 0.085], 0.09),
  ]),
  // legs
  ...mirrored((s) => [
    cone([s * 0.46, -0.05, 0.02], [s * 0.55, -2.45, 0.06], 0.44, 0.29, 0.25),
    cone([s * 0.55, -2.45, 0.06], [s * 0.6, -4.55, -0.04], 0.28, 0.16, 0.12),
    e([s * 0.57, -3.0, -0.08], [0.25, 0.6, 0.24], 0.15),
    e([s * 0.62, -4.85, 0.2], [0.18, 0.13, 0.42], 0.1),
  ]),
];

/**
 * Axis-aligned bounds that contain the whole figure.
 *
 * The margin is deliberate: marching cubes only polygonizes the grid's inner
 * cells (1 … size − 2), so the outer ~8 % of each axis is never meshed. Bounds
 * drawn tight to the body cut the shell off at the crown and the soles.
 */
export const BODY_BOUNDS = {
  min: [-2.45, -5.55, -1.0] as const,
  max: [2.45, 5.45, 1.0] as const,
};

/** Landmarks used by the choreography (body-local). */
export const HEART: readonly [number, number, number] = [0.24, 2.25, 0.22];
export const BRAIN: readonly [number, number, number] = [0, 4.42, 0.02];

/*
 * The field is evaluated millions of times while the figure is built, so the
 * parts are packed into one flat array and evaluated without allocation.
 * (`Math.hypot` is avoided on purpose: in V8 it is several times slower than
 * `Math.sqrt` of a sum of squares.)
 *
 * Layout per part, 12 numbers:
 *   ellipsoid  0, k, cx, cy, cz, rx, ry, rz, 1/rx², 1/ry², 1/rz², -min(r)
 *   cone       1, k, ax, ay, az, bax, bay, baz, 1/|ba|², ra, rb - ra, 0
 */
const STRIDE = 12;
const PACKED = (() => {
  const out = new Float64Array(PARTS.length * STRIDE);
  PARTS.forEach((p, i) => {
    const o = i * STRIDE;
    if (p.kind === 'e') {
      out.set([0, p.k, ...p.c, ...p.r, 1 / (p.r[0] * p.r[0]), 1 / (p.r[1] * p.r[1]), 1 / (p.r[2] * p.r[2]), -Math.min(...p.r)], o);
    } else {
      const ba = [p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]] as const;
      out.set([1, p.k, ...p.a, ...ba, 1 / (ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]), p.ra, p.rb - p.ra, 0], o);
    }
  });
  return out;
})();

function partDistance(o: number, x: number, y: number, z: number): number {
  const P = PACKED;
  if (P[o] === 0) {
    const px = x - P[o + 2]!;
    const py = y - P[o + 3]!;
    const pz = z - P[o + 4]!;
    const qx = px / P[o + 5]!;
    const qy = py / P[o + 6]!;
    const qz = pz / P[o + 7]!;
    const k0 = Math.sqrt(qx * qx + qy * qy + qz * qz);
    const wx = px * P[o + 8]!;
    const wy = py * P[o + 9]!;
    const wz = pz * P[o + 10]!;
    const k1 = Math.sqrt(wx * wx + wy * wy + wz * wz);
    return k1 === 0 ? P[o + 11]! : (k0 * (k0 - 1)) / k1;
  }
  const bax = P[o + 5]!;
  const bay = P[o + 6]!;
  const baz = P[o + 7]!;
  const pax = x - P[o + 2]!;
  const pay = y - P[o + 3]!;
  const paz = z - P[o + 4]!;
  let h = (pax * bax + pay * bay + paz * baz) * P[o + 8]!;
  h = h < 0 ? 0 : h > 1 ? 1 : h;
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (P[o + 9]! + P[o + 10]! * h);
}

/** Signed distance to the figure's surface: negative inside, positive outside. */
export function bodySdf(x: number, y: number, z: number): number {
  let d = partDistance(0, x, y, z);
  for (let o = STRIDE; o < PACKED.length; o += STRIDE) {
    const b = partDistance(o, x, y, z);
    const k = PACKED[o + 1]!;
    if (k <= 0) {
      d = d < b ? d : b;
    } else {
      const diff = d > b ? d - b : b - d;
      const m = d < b ? d : b;
      const h = k - diff > 0 ? (k - diff) / k : 0;
      d = m - h * h * k * 0.25;
    }
  }
  return d;
}

/** Unit surface normal (the distance field's gradient). */
export function bodyNormal(x: number, y: number, z: number, out: [number, number, number]): void {
  const h = 0.01;
  const nx = bodySdf(x + h, y, z) - bodySdf(x - h, y, z);
  const ny = bodySdf(x, y + h, z) - bodySdf(x, y - h, z);
  const nz = bodySdf(x, y, z + h) - bodySdf(x, y, z - h);
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  out[0] = nx / l;
  out[1] = ny / l;
  out[2] = nz / l;
}

// ---------------------------------------------------------------------------
// Cooperative work
//
// Sampling tens of thousands of points is a few hundred milliseconds of CPU.
// The samplers are generators that yield regularly, so the caller can spread
// the work across frames and never block the page's first interactions.
// ---------------------------------------------------------------------------

export type Work<T> = Generator<undefined, T, undefined>;

/** Run a generator to completion synchronously (tests, scripts). */
export function runNow<T>(work: Work<T>): T {
  for (;;) {
    const step = work.next();
    if (step.done === true) return step.value;
  }
}

// ---------------------------------------------------------------------------
// Figure particles
// ---------------------------------------------------------------------------

export const PARTICLE_KIND = { surface: 0, interior: 1, brain: 2 } as const;

export interface FigureParticles {
  readonly count: number;
  readonly position: Float32Array;
  readonly normal: Float32Array;
  /** 0 surface · 1 interior haze · 2 neural cluster in the head */
  readonly kind: Float32Array;
  readonly rand: Float32Array;
}

export function* sampleFigure(counts: { surface: number; interior: number; brain: number }, seed = 1729): Work<FigureParticles> {
  const rand = mulberry32(seed);
  const total = counts.surface + counts.interior + counts.brain;
  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const kind = new Float32Array(total);
  const rnd = new Float32Array(total * 4);
  const [x0, y0, z0] = BODY_BOUNDS.min;
  const [x1, y1, z1] = BODY_BOUNDS.max;
  const n: [number, number, number] = [0, 0, 0];

  let i = 0;
  const put = (x: number, y: number, z: number, k: number) => {
    position.set([x, y, z], i * 3);
    normal.set(n, i * 3);
    kind[i] = k;
    rnd.set([rand(), rand(), rand(), rand()], i * 4);
    i++;
  };

  // Surface: sample a band around the surface, then project onto it.
  let guard = 0;
  while (i < counts.surface && guard++ < counts.surface * 400) {
    let x = x0 + (x1 - x0) * rand();
    let y = y0 + (y1 - y0) * rand();
    let z = z0 + (z1 - z0) * rand();
    let d = bodySdf(x, y, z);
    if (Math.abs(d) > 0.22) continue;
    for (let s = 0; s < 3; s++) {
      bodyNormal(x, y, z, n);
      x -= n[0] * d;
      y -= n[1] * d;
      z -= n[2] * d;
      d = bodySdf(x, y, z);
    }
    if (Math.abs(d) > 0.012) continue;
    bodyNormal(x, y, z, n);
    put(x, y, z, PARTICLE_KIND.surface);
    if (i % 1500 === 0) yield;
  }

  // Interior haze: anywhere comfortably inside.
  guard = 0;
  const interiorEnd = counts.surface + counts.interior;
  while (i < interiorEnd && guard++ < counts.interior * 400) {
    const x = x0 + (x1 - x0) * rand();
    const y = y0 + (y1 - y0) * rand();
    const z = z0 + (z1 - z0) * rand();
    if (bodySdf(x, y, z) > -0.08) continue;
    bodyNormal(x, y, z, n);
    put(x, y, z, PARTICLE_KIND.interior);
    if (i % 3000 === 0) yield;
  }

  // Neural cluster: a denser cloud in the upper head, weighted toward its shell.
  while (i < total) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = Math.pow(rand(), 0.35);
    const x = BRAIN[0] + s * Math.cos(th) * 0.38 * r;
    const y = BRAIN[1] + u * 0.4 * r;
    const z = BRAIN[2] + s * Math.sin(th) * 0.44 * r;
    n[0] = s * Math.cos(th);
    n[1] = u;
    n[2] = s * Math.sin(th);
    put(x, y, z, PARTICLE_KIND.brain);
  }

  return { count: i, position, normal, kind, rand: rnd };
}

/**
 * The distance field as a marching-cubes density grid: positive inside.
 * Grid index (x, y, z) maps to body space through `BODY_BOUNDS`, matching how
 * three's MarchingCubes lays out a cube of side 2 scaled to the bounds.
 */
export function* fillDensity(size: number): Work<Float32Array> {
  const field = new Float32Array(size * size * size);
  const half = size / 2;
  const cx = (BODY_BOUNDS.min[0] + BODY_BOUNDS.max[0]) / 2;
  const cy = (BODY_BOUNDS.min[1] + BODY_BOUNDS.max[1]) / 2;
  const cz = (BODY_BOUNDS.min[2] + BODY_BOUNDS.max[2]) / 2;
  const sx = (BODY_BOUNDS.max[0] - BODY_BOUNDS.min[0]) / 2;
  const sy = (BODY_BOUNDS.max[1] - BODY_BOUNDS.min[1]) / 2;
  const sz = (BODY_BOUNDS.max[2] - BODY_BOUNDS.min[2]) / 2;
  for (let z = 0; z < size; z++) {
    const bz = cz + ((z - half) / half) * sz;
    for (let y = 0; y < size; y++) {
      const by = cy + ((y - half) / half) * sy;
      for (let x = 0; x < size; x++) {
        const bx = cx + ((x - half) / half) * sx;
        field[z * size * size + y * size + x] = -bodySdf(bx, by, bz);
      }
    }
    yield;
  }
  return field;
}

/** Centre and half-extents of `BODY_BOUNDS`, for placing the marching-cubes mesh. */
export function boundsTransform(): { centre: [number, number, number]; half: [number, number, number] } {
  const { min, max } = BODY_BOUNDS;
  return {
    centre: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    half: [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2],
  };
}

// ---------------------------------------------------------------------------
// Networks: neural and vascular paths inside the figure
// ---------------------------------------------------------------------------

type P3 = readonly [number, number, number];
type Path = readonly P3[];

export const NETWORK_KIND = { neural: 0, vascular: 1 } as const;

const NEURAL: Path[] = [
  // brainstem and spinal cord
  [[0, 4.05, -0.1], [0, 3.55, -0.24], [0, 2.6, -0.34], [0, 1.4, -0.3], [0, 0.4, -0.26], [0, 0.0, -0.22]],
  ...([-1, 1] as const).flatMap((s): Path[] => [
    // brachial nerves to the hands
    [[0, 3.2, -0.26], [s * 0.6, 3.08, -0.12], [s * 1.1, 2.85, -0.02], [s * 1.44, 1.45, 0.02], [s * 1.72, 0.1, 0.17], [s * 1.84, -0.5, 0.22]],
    // intercostal branches: short diagonals off the cord, like ribs, not hoops
    ...[2.6, 1.95].map((y): Path => [[0, y, -0.33], [s * 0.45, y - 0.14, -0.2], [s * 0.72, y - 0.38, 0.05]]),
    // sciatic nerves to the feet
    [[0, 0.1, -0.24], [s * 0.38, -0.25, -0.12], [s * 0.52, -2.4, -0.06], [s * 0.58, -4.4, -0.06], [s * 0.62, -4.85, 0.38]],
  ]),
];

const VASCULAR: Path[] = [
  // aortic arch and descending aorta
  [[HEART[0], HEART[1], HEART[2]], [0.12, 2.85, 0.16], [-0.08, 3.08, 0.05], [-0.14, 2.6, -0.12], [-0.06, 1.2, -0.08], [0, 0.25, -0.02]],
  ...([-1, 1] as const).flatMap((s): Path[] => [
    // iliac arteries to the feet
    [[0, 0.25, -0.02], [s * 0.42, -0.25, 0.08], [s * 0.53, -2.4, 0.13], [s * 0.6, -4.35, 0.06], [s * 0.64, -4.85, 0.46]],
    // carotids
    [[0.04, 3.02, 0.1], [s * 0.18, 3.55, 0.14], [s * 0.2, 4.0, 0.12]],
    // subclavian and brachial arteries
    [[0.02, 3.0, 0.08], [s * 0.78, 3.02, 0.12], [s * 1.18, 2.8, 0.12], [s * 1.5, 1.42, 0.14], [s * 1.78, 0.05, 0.27], [s * 1.86, -0.62, 0.26]],
    // torso branches
    [[HEART[0], HEART[1], HEART[2]], [s * 0.5, 2.0, 0.38], [s * 0.62, 1.2, 0.36], [s * 0.4, 0.5, 0.36]],
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
          dist.push(Math.hypot(p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]) / NETWORK_REACH);
          kind.push(k);
          seed.push(s);
        }
        samples.push([a[0], a[1], a[2], k]);
      }
    }
  };
  add(NEURAL, NETWORK_KIND.neural, BRAIN);
  add(VASCULAR, NETWORK_KIND.vascular, HEART);

  return {
    position: new Float32Array(verts),
    dist: new Float32Array(dist),
    kind: new Float32Array(kind),
    seed: new Float32Array(seed),
    samples,
  };
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
    nodes.push([BRAIN[0] + s * Math.cos(th) * 0.36 * r, BRAIN[1] + u * 0.38 * r, BRAIN[2] + s * Math.sin(th) * 0.42 * r]);
  }
  const out: number[] = [];
  let made = 0;
  for (let i = 0; i < nodes.length && made < count; i++) {
    const a = nodes[i]!;
    for (let j = i + 1; j < nodes.length && made < count; j++) {
      const b = nodes[j]!;
      if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.3) {
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
  if (r < 0.56) {
    // two leaflets of lipid heads
    const x = (rand() - 0.5) * 4.6;
    const y = (rand() - 0.5) * 3.0;
    const leaf = rand() < 0.5 ? -1 : 1;
    const z = curve(x, y) + leaf * 0.11 + (rand() - 0.5) * 0.02;
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
