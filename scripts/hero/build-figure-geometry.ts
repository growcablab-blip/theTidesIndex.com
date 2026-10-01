/**
 * Build the hero figure: `public/hero/figure.bin` and
 * `src/components/showcase/hero/figure-landmarks.ts`.
 *
 *   npm run hero:geometry
 *
 * Source: the MakeHuman base mesh (CC0), `assets/hero/makehuman-base.obj`.
 * See `assets/hero/README.md` for provenance and the full list of changes.
 *
 * Steps:
 *   1. keep the `body` group only (no eyes, teeth, hair or clothing helpers),
 *      triangulate its quads
 *   2. re-pose from the modelling A-pose into a relaxed standing pose — arms
 *      lowered, elbows softened, head turned a little, deliberately asymmetric —
 *      with smooth, distance-based weights around each joint
 *   3. normalize to body units: 10 tall, feet at y = −5, facing +z
 *   4. recompute smooth normals, voxelize an occupancy grid (ray parity), and
 *      write the joints the choreography anchors to
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeFigure, FIGURE_BOUNDS, FIGURE_URL } from '../../src/components/showcase/hero/figure-format';

type V3 = [number, number, number];
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------------------------------------------------------------------------
// 1. Parse
// ---------------------------------------------------------------------------

const lines = readFileSync(join(root, 'assets/hero/makehuman-base.obj'), 'utf8').split('\n');
const verts: V3[] = [];
const groups = new Map<string, number[][]>();
let group = '';
for (const line of lines) {
  if (line.startsWith('v ')) {
    const [, x, y, z] = line.trim().split(/\s+/);
    verts.push([Number(x), Number(y), Number(z)]);
  } else if (line.startsWith('g ')) {
    group = line.slice(2).trim();
  } else if (line.startsWith('f ')) {
    const face = line.trim().split(/\s+/).slice(1).map((t) => Number.parseInt(t.split('/')[0]!, 10) - 1);
    let list = groups.get(group);
    if (!list) groups.set(group, (list = []));
    list.push(face);
  }
}

function joint(name: string): V3 {
  const faces = groups.get(`joint-${name}`);
  if (!faces) throw new Error(`missing joint ${name}`);
  const s: V3 = [0, 0, 0];
  let n = 0;
  for (const f of faces) for (const i of f) {
    const v = verts[i]!;
    s[0] += v[0];
    s[1] += v[1];
    s[2] += v[2];
    n++;
  }
  return [s[0] / n, s[1] / n, s[2] / n];
}

const bodyFaces = groups.get('body');
if (!bodyFaces) throw new Error('no body group');
// Compact the vertex list to the body's own vertices.
const remap = new Map<number, number>();
const pos: V3[] = [];
for (const f of bodyFaces) for (const i of f) if (!remap.has(i)) {
  remap.set(i, pos.length);
  pos.push([...verts[i]!] as V3);
}
const tris: number[] = [];
for (const f of bodyFaces) {
  const m = f.map((i) => remap.get(i)!);
  for (let k = 1; k < m.length - 1; k++) tris.push(m[0]!, m[k]!, m[k + 1]!);
}

// ---------------------------------------------------------------------------
// 2. Pose
// ---------------------------------------------------------------------------

const J = {
  head: joint('head'),
  headTop: joint('head-2'),
  neck: joint('neck'),
  jaw: joint('jaw'),
  spine1: joint('spine-1'),
  spine2: joint('spine-2'),
  spine3: joint('spine-3'),
  spine4: joint('spine-4'),
  pelvis: joint('pelvis'),
  lClavicle: joint('l-clavicle'),
  rClavicle: joint('r-clavicle'),
  lShoulder: joint('l-shoulder'),
  rShoulder: joint('r-shoulder'),
  lElbow: joint('l-elbow'),
  rElbow: joint('r-elbow'),
  lHand: joint('l-hand'),
  rHand: joint('r-hand'),
  lHandTip: joint('l-hand-2'),
  rHandTip: joint('r-hand-2'),
  lHip: joint('l-upper-leg'),
  rHip: joint('r-upper-leg'),
  lKnee: joint('l-knee'),
  rKnee: joint('r-knee'),
  lAnkle: joint('l-ankle'),
  rAnkle: joint('r-ankle'),
  lToe: joint('l-foot-2'),
  rToe: joint('r-foot-2'),
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.sqrt(dot(a, a));
const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function segDist(p: V3, a: V3, b: V3): number {
  const ab = sub(b, a);
  const t = Math.min(1, Math.max(0, dot(sub(p, a), ab) / dot(ab, ab)));
  return len(sub(p, add(a, [ab[0] * t, ab[1] * t, ab[2] * t])));
}
/** Rotate p about pivot, around a unit axis, by angle. */
function rotate(p: V3, pivot: V3, axis: V3, angle: number): V3 {
  const v = sub(p, pivot);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const d = dot(axis, v);
  const cr: V3 = [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]];
  return add(pivot, [v[0] * c + cr[0] * s + axis[0] * d * (1 - c), v[1] * c + cr[1] * s + axis[1] * d * (1 - c), v[2] * c + cr[2] * s + axis[2] * d * (1 - c)]);
}

const Z: V3 = [0, 0, 1];
const X: V3 = [1, 0, 0];
const Y: V3 = [0, 1, 0];
const deg = Math.PI / 180;

interface ArmPose {
  side: 1 | -1;
  shoulder: V3;
  elbow: V3;
  hand: V3;
  tip: V3;
  lower: number; // degrees the whole arm comes down toward the body
  bend: number; // degrees the forearm swings back toward vertical at the elbow (the source forearm points forward)
  inward: number; // degrees the forearm comes further in at the elbow
}

const ARMS: ArmPose[] = [
  { side: 1, shoulder: J.lShoulder, elbow: J.lElbow, hand: J.lHand, tip: J.lHandTip, lower: 29, bend: 46, inward: 7 },
  { side: -1, shoulder: J.rShoulder, elbow: J.rElbow, hand: J.rHand, tip: J.rHandTip, lower: 26, bend: 41, inward: 5 },
];

/** How much of the arm chain a point belongs to (0 torso … 1 arm), and past the elbow. */
function armWeights(p: V3, a: ArmPose): { shoulder: number; elbow: number } {
  // The fingers run well past the last hand joint, along the forearm's line.
  const fingers = add(a.tip, (() => {
    const d0 = norm(sub(a.tip, a.elbow));
    return [d0[0] * 1.3, d0[1] * 1.3, d0[2] * 1.3] as V3;
  })());
  // The thumb sits off that line; the whole hand is taken within a generous radius.
  const d = Math.min(segDist(p, a.shoulder, a.elbow), segDist(p, a.elbow, a.hand), segDist(p, a.hand, fingers) - 0.15, len(sub(p, a.hand)) - 0.7);
  // Only the arm's own side, and only near its bones.
  if (p[0] * a.side < 0.9) return { shoulder: 0, elbow: 0 };
  const near = 1 - smooth(0.62, 0.95, d);
  const along = dot(sub(p, a.shoulder), norm(sub(a.elbow, a.shoulder)));
  // a wide blend across the deltoid, so lowering the arm leaves no crease
  const shoulder = near * smooth(-0.7, 1.1, along);
  const alongElbow = dot(sub(p, a.elbow), norm(sub(a.hand, a.elbow)));
  const elbow = near * smooth(-0.25, 0.3, alongElbow);
  return { shoulder, elbow };
}

/** The legs come in from the modelling stance, not quite evenly. */
const LEGS = [
  { side: 1 as const, hip: J.lHip, knee: J.lKnee, ankle: J.lAnkle, toe: J.lToe, inward: 4.5 },
  { side: -1 as const, hip: J.rHip, knee: J.rKnee, ankle: J.rAnkle, toe: J.rToe, inward: 3.2 },
];

function legWeight(p: V3, l: (typeof LEGS)[number]): number {
  if (p[0] * l.side < 0.05) return 0;
  const d = Math.min(segDist(p, l.hip, l.knee), segDist(p, l.knee, l.ankle), segDist(p, l.ankle, l.toe));
  const near = 1 - smooth(0.85, 1.25, d);
  // blend in below the hip joint, so the pelvis stays put
  return near * smooth(l.hip[1] + 0.2, l.hip[1] - 0.9, p[1]);
}

/**
 * The base mesh is androgynous, but in profile its chest still reads as
 * gendered. The figure is meant to be anyone, so the chest front is drawn back
 * toward a flatter plane, smoothly, before anything else moves.
 */
function neutralChest(p: V3): V3 {
  const top = J.spine1[1] + 0.35;
  const bottom = J.spine2[1] + 0.2;
  const band = smooth(bottom - 0.6, bottom + 0.3, p[1]) * (1 - smooth(top - 0.2, top + 0.5, p[1]));
  const lateral = 1 - smooth(1.0, 1.5, Math.abs(p[0]));
  const plane = 0.72;
  const w = band * lateral * smooth(plane - 0.1, plane + 0.25, p[2]);
  if (w <= 0) return p;
  return [p[0], p[1], p[2] - (p[2] - plane) * 0.82 * w];
}

function posePoint(p0: V3): V3 {
  const p = neutralChest(p0);
  let q: V3 = p;
  for (const l of LEGS) {
    const w = legWeight(p, l);
    if (w > 0) q = rotate(q, l.hip, Z, -l.side * l.inward * deg * w);
  }
  for (const a of ARMS) {
    const w = armWeights(p, a);
    if (w.shoulder <= 0) continue;
    // forearm first, about the elbow: back toward vertical (around x) and a little further in (around z)
    if (w.elbow > 0) {
      q = rotate(q, a.elbow, X, a.bend * deg * w.elbow);
      q = rotate(q, a.elbow, Z, -a.side * a.inward * deg * w.elbow);
    }
    // then the whole arm down, about the shoulder
    q = rotate(q, a.shoulder, Z, -a.side * a.lower * deg * w.shoulder);
  }
  // head: a slight turn and tilt, blended in above the neck
  const hw = smooth(J.neck[1] - 0.1, J.neck[1] + 0.7, p[1]) * (1 - smooth(1.1, 1.6, Math.abs(p[0])));
  if (hw > 0) {
    q = rotate(q, J.neck, Y, 7 * deg * hw);
    q = rotate(q, J.neck, Z, 2.5 * deg * hw);
  }
  return q;
}

const posed = pos.map(posePoint);
const posedJ = Object.fromEntries(Object.entries(J).map(([k, v]) => [k, posePoint(v)])) as Record<keyof typeof J, V3>;

// ---------------------------------------------------------------------------
// 3. Normalize: 10 tall, feet at −5, centred on the spine
// ---------------------------------------------------------------------------

let minY = Infinity;
let maxY = -Infinity;
for (const p of posed) {
  minY = Math.min(minY, p[1]);
  maxY = Math.max(maxY, p[1]);
}
const scale = 10 / (maxY - minY);
const toBody = (p: V3): V3 => [(p[0] - J.pelvis[0]) * scale, (p[1] - minY) * scale - 5, (p[2] - J.spine2[2]) * scale];
const body = posed.map(toBody);
const landmarks = Object.fromEntries(Object.entries(posedJ).map(([k, v]) => [k, toBody(v)])) as Record<keyof typeof J, V3>;

const bmin: V3 = [Infinity, Infinity, Infinity];
const bmax: V3 = [-Infinity, -Infinity, -Infinity];
for (const p of body) for (let a = 0; a < 3; a++) {
  bmin[a] = Math.min(bmin[a]!, p[a]!);
  bmax[a] = Math.max(bmax[a]!, p[a]!);
}
for (let a = 0; a < 3; a++) {
  if (bmin[a]! < FIGURE_BOUNDS.min[a]! || bmax[a]! > FIGURE_BOUNDS.max[a]!) {
    throw new Error(`posed figure exceeds FIGURE_BOUNDS on axis ${String(a)}: ${bmin[a]!.toFixed(3)}…${bmax[a]!.toFixed(3)}`);
  }
}

// ---------------------------------------------------------------------------
// 4. Remove the head's inner cavities
//
// The base mesh models the mouth cavity and eye sockets inside the head. Seen
// through a translucent skin their walls read as a mask over the face. A head
// triangle that cannot see out — most rays over its outward hemisphere meet the
// head again — is enclosed, and is dropped. Rays march through a coarse grid of
// triangle bins so the test stays quick.
// ---------------------------------------------------------------------------

{
  const neckY = landmarks.neck[1];
  const headTris: number[] = [];
  for (let t = 0; t < tris.length; t += 3) if (body[tris[t]!]![1] > neckY - 0.15) headTris.push(t);
  const CELL = 0.08;
  const key = (x: number, y: number, z: number) => `${String(Math.floor(x / CELL))},${String(Math.floor(y / CELL))},${String(Math.floor(z / CELL))}`;
  const bins = new Map<string, number[]>();
  for (const t of headTris) {
    const ps = [body[tris[t]!]!, body[tris[t + 1]!]!, body[tris[t + 2]!]!];
    const lo = [0, 1, 2].map((a) => Math.floor(Math.min(...ps.map((p) => p[a]!)) / CELL));
    const hi = [0, 1, 2].map((a) => Math.floor(Math.max(...ps.map((p) => p[a]!)) / CELL));
    for (let x = lo[0]!; x <= hi[0]!; x++) for (let y = lo[1]!; y <= hi[1]!; y++) for (let z = lo[2]!; z <= hi[2]!; z++) {
      const k = `${String(x)},${String(y)},${String(z)}`;
      let b = bins.get(k);
      if (!b) bins.set(k, (b = []));
      b.push(t);
    }
  }
  const rayHits = (o: V3, d: V3, skip: number): boolean => {
    const seen = new Set<number>();
    for (let s = CELL * 0.5; s < 1.6; s += CELL * 0.5) {
      const cell = bins.get(key(o[0] + d[0] * s, o[1] + d[1] * s, o[2] + d[2] * s));
      if (!cell) continue;
      for (const t of cell) {
        if (t === skip || seen.has(t)) continue;
        seen.add(t);
        const a = body[tris[t]!]!;
        const e1 = sub(body[tris[t + 1]!]!, a);
        const e2 = sub(body[tris[t + 2]!]!, a);
        const pv: V3 = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
        const det = dot(e1, pv);
        if (Math.abs(det) < 1e-12) continue;
        const tv = sub(o, a);
        const u = dot(tv, pv) / det;
        if (u < 0 || u > 1) continue;
        const qv: V3 = [tv[1] * e1[2] - tv[2] * e1[1], tv[2] * e1[0] - tv[0] * e1[2], tv[0] * e1[1] - tv[1] * e1[0]];
        const v = dot(d, qv) / det;
        if (v < 0 || u + v > 1) continue;
        if (dot(e2, qv) / det > 1e-4) return true;
      }
    }
    return false;
  };
  // Fixed directions over a hemisphere (Fibonacci), turned to each normal.
  const DIRS: V3[] = Array.from({ length: 20 }, (_, i) => {
    const z = 1 - (i + 0.5) / 20;
    const r = Math.sqrt(1 - z * z);
    const th = i * 2.399963;
    return [r * Math.cos(th), r * Math.sin(th), z] as V3;
  });
  const drop = new Set<number>();
  for (const t of headTris) {
    const a = body[tris[t]!]!;
    const b = body[tris[t + 1]!]!;
    const c = body[tris[t + 2]!]!;
    const e1 = sub(b, a);
    const e2 = sub(c, a);
    const n = norm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
    // an orthonormal frame around the normal
    const helper: V3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const tx = norm([helper[1] * n[2] - helper[2] * n[1], helper[2] * n[0] - helper[0] * n[2], helper[0] * n[1] - helper[1] * n[0]]);
    const ty: V3 = [n[1] * tx[2] - n[2] * tx[1], n[2] * tx[0] - n[0] * tx[2], n[0] * tx[1] - n[1] * tx[0]];
    const o: V3 = [(a[0] + b[0] + c[0]) / 3 + n[0] * 1e-3, (a[1] + b[1] + c[1]) / 3 + n[1] * 1e-3, (a[2] + b[2] + c[2]) / 3 + n[2] * 1e-3];
    let hits = 0;
    for (const d of DIRS) {
      const w: V3 = [tx[0] * d[0] + ty[0] * d[1] + n[0] * d[2], tx[1] * d[0] + ty[1] * d[1] + n[1] * d[2], tx[2] * d[0] + ty[2] * d[1] + n[2] * d[2]];
      if (rayHits(o, w, t)) hits++;
    }
    if (hits >= 17) drop.add(t);
  }
  const kept: number[] = [];
  for (let t = 0; t < tris.length; t += 3) if (!drop.has(t)) kept.push(tris[t]!, tris[t + 1]!, tris[t + 2]!);
  console.log(`removed ${String(drop.size)} enclosed triangles from the head`);
  tris.length = 0;
  tris.push(...kept);
}

// ---------------------------------------------------------------------------
// 5. Normals, occupancy, output
// ---------------------------------------------------------------------------

const normals = new Float32Array(body.length * 3);
for (let i = 0; i < tris.length; i += 3) {
  const [a, b, c] = [tris[i]!, tris[i + 1]!, tris[i + 2]!];
  const pa = body[a]!;
  const e1 = sub(body[b]!, pa);
  const e2 = sub(body[c]!, pa);
  const n: V3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  for (const k of [a, b, c]) {
    normals[k * 3] = normals[k * 3]! + n[0];
    normals[k * 3 + 1] = normals[k * 3 + 1]! + n[1];
    normals[k * 3 + 2] = normals[k * 3 + 2]! + n[2];
  }
}
for (let i = 0; i < normals.length; i += 3) {
  const n = norm([normals[i]!, normals[i + 1]!, normals[i + 2]!]);
  normals.set(n, i);
}

/** Ray parity along z for every (x, y) column of the grid. */
const GRID: [number, number, number] = [44, 100, 30];
const occ = new Uint8Array(Math.ceil((GRID[0] * GRID[1] * GRID[2]) / 8));
{
  const { min, max } = FIGURE_BOUNDS;
  const cell = (a: number) => (max[a]! - min[a]!) / GRID[a]!;
  const bins = new Map<number, number[]>();
  for (let t = 0; t < tris.length; t += 3) {
    const ps = [body[tris[t]!]!, body[tris[t + 1]!]!, body[tris[t + 2]!]!];
    const x0 = Math.floor((Math.min(...ps.map((p) => p[0])) - min[0]) / cell(0));
    const x1 = Math.floor((Math.max(...ps.map((p) => p[0])) - min[0]) / cell(0));
    const y0 = Math.floor((Math.min(...ps.map((p) => p[1])) - min[1]) / cell(1));
    const y1 = Math.floor((Math.max(...ps.map((p) => p[1])) - min[1]) / cell(1));
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const k = x + y * GRID[0];
      let b = bins.get(k);
      if (!b) bins.set(k, (b = []));
      b.push(t);
    }
  }
  for (let ix = 0; ix < GRID[0]; ix++) for (let iy = 0; iy < GRID[1]; iy++) {
    const px = min[0] + (ix + 0.5) * cell(0);
    const py = min[1] + (iy + 0.5) * cell(1);
    const hits: number[] = [];
    for (const t of bins.get(ix + iy * GRID[0]) ?? []) {
      const [a, b, c] = [body[tris[t]!]!, body[tris[t + 1]!]!, body[tris[t + 2]!]!];
      const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(d) < 1e-12) continue;
      const l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d;
      const l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      hits.push(l1 * a[2] + l2 * b[2] + l3 * c[2]);
    }
    hits.sort((u, v) => u - v);
    // Holes in the mesh (eye sockets) can leave an odd count; drop the last.
    const pairs = hits.length - (hits.length % 2);
    for (let h = 0; h < pairs; h += 2) {
      for (let iz = 0; iz < GRID[2]; iz++) {
        const pz = min[2] + (iz + 0.5) * cell(2);
        if (pz > hits[h]! && pz < hits[h + 1]!) {
          const bit = ix + GRID[0] * (iy + GRID[1] * iz);
          occ[bit >> 3] = occ[bit >> 3]! | (1 << (bit & 7));
        }
      }
    }
  }
}

const position = new Float32Array(body.flat());
const buf = encodeFigure({ position, normal: normals, index: new Uint16Array(tris), grid: GRID, occupancy: occ });
const out = join(root, 'public', FIGURE_URL);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(buf));

// Landmarks, plus two the choreography needs that are not joints.
const L = landmarks;
const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const heart: V3 = add(mix(L.spine1, L.spine2, 0.35), [0.16, 0, 0.22]);
const brain: V3 = add(mix(L.head, L.headTop, 0.45), [0, 0, 0.02]);
const all: Record<string, V3> = { ...L, heart, brain };
const fmt = (p: V3) => `[${p.map((n) => n.toFixed(3)).join(', ')}]`;
const ts = `/**
 * Landmarks on the posed figure, in body units. GENERATED by
 * \`npm run hero:geometry\` from the MakeHuman base mesh's own joints — do not
 * edit by hand. \`heart\` and \`brain\` are placed relative to the spine and head.
 */
export type Point = readonly [number, number, number];

export const LANDMARKS = {
${Object.entries(all)
  .map(([k, v]) => `  ${k}: ${fmt(v)} as Point,`)
  .join('\n')}
} as const;
`;
writeFileSync(join(root, 'src/components/showcase/hero/figure-landmarks.ts'), ts);

let inside = 0;
for (let i = 0; i < GRID[0] * GRID[1] * GRID[2]; i++) if ((occ[i >> 3]! >> (i & 7)) & 1) inside++;
console.log(
  `wrote ${FIGURE_URL} — ${String(body.length)} vertices, ${String(tris.length / 3)} triangles, ` +
    `${(buf.byteLength / 1024).toFixed(0)} KB; bounds x ${bmin[0].toFixed(2)}…${bmax[0].toFixed(2)}, ` +
    `z ${bmin[2].toFixed(2)}…${bmax[2].toFixed(2)}; ${String(inside)} inside cells`,
);
