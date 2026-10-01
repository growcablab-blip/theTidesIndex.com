/**
 * The pre-built figure file (`public/hero/figure.bin`).
 *
 * The figure is a real human mesh — the MakeHuman base mesh (CC0; see
 * `assets/hero/README.md`), re-posed and normalized by `npm run hero:geometry`.
 * The file carries the mesh itself and a coarse occupancy grid; the renderer
 * samples its point cloud from the mesh at load, which is cheaper than shipping
 * the points.
 *
 * Layout, little-endian:
 *
 *   header (32 bytes)
 *     0   'TIDF'           magic
 *     4   u16 version
 *     6   u16 reserved
 *     8   u32 vertices
 *     12  u32 triangles
 *     16  u16 gx, u16 gy   occupancy grid size
 *     20  u16 gz, u16 pad
 *     24  8 bytes reserved
 *   positions   i16 × 3 × v   normalized to FIGURE_BOUNDS
 *   normals     i8 × 3 × v    unit normal × 127 (then padded to an even offset)
 *   indices     u16 × 3 × t
 *   occupancy   bits, gx·gy·gz, x fastest — 1 = inside the body
 */

/** Body units: 10 tall, feet at y = −5, facing +z. Bounds hold the posed figure. */
export const FIGURE_BOUNDS = {
  min: [-1.65, -5.05, -0.85] as const,
  max: [1.65, 5.05, 1.1] as const,
};

export const FIGURE_MAGIC = 'TIDF';
export const FIGURE_VERSION = 2;
export const FIGURE_HEADER_BYTES = 32;
export const FIGURE_URL = '/hero/figure.bin';

export interface FigureFile {
  readonly vertices: number;
  readonly triangles: number;
  readonly grid: readonly [number, number, number];
  /** Normalized i16 positions (−32767…32767 across FIGURE_BOUNDS). */
  readonly positions: Int16Array;
  readonly normals: Int8Array;
  readonly indices: Uint16Array;
  readonly occupancy: Uint8Array;
}

function layout(v: number, t: number, grid: readonly [number, number, number]) {
  const pos = FIGURE_HEADER_BYTES;
  const nor = pos + v * 6;
  const idx = nor + v * 3 + ((v * 3) % 2);
  const occ = idx + t * 6;
  const occBytes = Math.ceil((grid[0] * grid[1] * grid[2]) / 8);
  return { pos, nor, idx, occ, occBytes, total: occ + occBytes };
}

export function boundsCentreHalf(): { centre: [number, number, number]; half: [number, number, number] } {
  const { min, max } = FIGURE_BOUNDS;
  return {
    centre: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    half: [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2],
  };
}

export function encodeFigure(input: {
  position: Float32Array;
  normal: Float32Array;
  index: Uint16Array;
  grid: readonly [number, number, number];
  occupancy: Uint8Array;
}): ArrayBuffer {
  const v = input.position.length / 3;
  const t = input.index.length / 3;
  const L = layout(v, t, input.grid);
  const buf = new ArrayBuffer(L.total);
  const view = new DataView(buf);
  for (let i = 0; i < 4; i++) view.setUint8(i, FIGURE_MAGIC.charCodeAt(i));
  view.setUint16(4, FIGURE_VERSION, true);
  view.setUint32(8, v, true);
  view.setUint32(12, t, true);
  view.setUint16(16, input.grid[0], true);
  view.setUint16(18, input.grid[1], true);
  view.setUint16(20, input.grid[2], true);

  const { centre, half } = boundsCentreHalf();
  const pos = new Int16Array(buf, L.pos, v * 3);
  for (let i = 0; i < v * 3; i++) {
    const a = i % 3;
    pos[i] = Math.round(Math.max(-1, Math.min(1, (input.position[i]! - centre[a]!) / half[a]!)) * 32767);
  }
  const nor = new Int8Array(buf, L.nor, v * 3);
  for (let i = 0; i < v * 3; i++) nor[i] = Math.round(Math.max(-1, Math.min(1, input.normal[i]!)) * 127);
  new Uint16Array(buf, L.idx, t * 3).set(input.index);
  new Uint8Array(buf, L.occ, L.occBytes).set(input.occupancy.subarray(0, L.occBytes));
  return buf;
}

export function decodeFigure(buf: ArrayBuffer): FigureFile {
  const view = new DataView(buf);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== FIGURE_MAGIC) throw new Error('figure file: bad magic');
  const version = view.getUint16(4, true);
  if (version !== FIGURE_VERSION) throw new Error(`figure file: unsupported version ${String(version)}`);
  const v = view.getUint32(8, true);
  const t = view.getUint32(12, true);
  const grid = [view.getUint16(16, true), view.getUint16(18, true), view.getUint16(20, true)] as const;
  const L = layout(v, t, grid);
  if (buf.byteLength !== L.total) throw new Error('figure file: truncated');
  return {
    vertices: v,
    triangles: t,
    grid,
    positions: new Int16Array(buf, L.pos, v * 3),
    normals: new Int8Array(buf, L.nor, v * 3),
    indices: new Uint16Array(buf, L.idx, t * 3),
    occupancy: new Uint8Array(buf, L.occ, L.occBytes),
  };
}

/** Positions back to body units (Float32), for sampling and for the GPU. */
export function dequantizePositions(file: FigureFile): Float32Array {
  const { centre, half } = boundsCentreHalf();
  const out = new Float32Array(file.positions.length);
  for (let i = 0; i < out.length; i++) {
    const a = i % 3;
    out[i] = centre[a]! + (file.positions[i]! / 32767) * half[a]!;
  }
  return out;
}

export function dequantizeNormals(file: FigureFile): Float32Array {
  const out = new Float32Array(file.normals.length);
  for (let i = 0; i < out.length; i += 3) {
    const x = file.normals[i]! / 127;
    const y = file.normals[i + 1]! / 127;
    const z = file.normals[i + 2]! / 127;
    const l = Math.sqrt(x * x + y * y + z * z) || 1;
    out[i] = x / l;
    out[i + 1] = y / l;
    out[i + 2] = z / l;
  }
  return out;
}

/** Whether a body-space point is inside the figure, per the occupancy grid. */
export function isInside(file: Pick<FigureFile, 'grid' | 'occupancy'>, x: number, y: number, z: number): boolean {
  const { min, max } = FIGURE_BOUNDS;
  const [gx, gy, gz] = file.grid;
  const ix = Math.floor(((x - min[0]) / (max[0] - min[0])) * gx);
  const iy = Math.floor(((y - min[1]) / (max[1] - min[1])) * gy);
  const iz = Math.floor(((z - min[2]) / (max[2] - min[2])) * gz);
  if (ix < 0 || iy < 0 || iz < 0 || ix >= gx || iy >= gy || iz >= gz) return false;
  const bit = ix + gx * (iy + gy * iz);
  return ((file.occupancy[bit >> 3]! >> (bit & 7)) & 1) === 1;
}
