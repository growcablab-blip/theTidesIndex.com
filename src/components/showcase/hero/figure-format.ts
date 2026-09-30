/**
 * The pre-built figure file (`public/hero/figure.bin`).
 *
 * Sampling the body takes seconds of CPU on a mid-range phone, and the result is
 * the same for every visitor, so it is computed once by `npm run hero:geometry`
 * and shipped as a compact binary. The renderer hands the arrays straight to the
 * GPU as normalized integer attributes — nothing is decoded on the main thread.
 *
 * Layout, little-endian:
 *
 *   header (32 bytes)
 *     0   'TIDF'            magic
 *     4   u16 version
 *     6   u16 grid size     density grid is size³
 *     8   u32 surface       particles, then …
 *     12  u32 interior      … then …
 *     16  u32 brain         … in that order, each shuffled so any prefix is a
 *                            uniform sample (lower tiers draw a prefix)
 *     20  f32 density range field values are clamped to ±range before quantizing
 *     24  8 bytes reserved
 *   positions  i16 × 3 × n  normalized to BODY_BOUNDS (−32767…32767)
 *   normals    i8 × 3 × s   unit normal × 127, surface particles only
 *   density    i8 × size³   inside positive, ±127 = ±range
 */
import { BODY_BOUNDS, boundsTransform } from './body-model';

export const FIGURE_MAGIC = 'TIDF';
export const FIGURE_VERSION = 1;
export const FIGURE_HEADER_BYTES = 32;
export const FIGURE_URL = '/hero/figure.bin';

export interface FigureFile {
  readonly version: number;
  readonly gridSize: number;
  readonly surface: number;
  readonly interior: number;
  readonly brain: number;
  readonly densityRange: number;
  /** Normalized i16 positions; multiply by `half` and add `centre` for body units. */
  readonly positions: Int16Array;
  /** Normals for the surface particles only (interior and brain need none). */
  readonly normals: Int8Array;
  readonly density: Int8Array;
}

export function figureByteLength(n: number, surface: number, gridSize: number): number {
  // positions end on an even offset; normals and density are byte arrays.
  return FIGURE_HEADER_BYTES + n * 6 + surface * 3 + gridSize ** 3;
}

export function encodeFigure(input: {
  surface: number;
  interior: number;
  brain: number;
  position: Float32Array;
  normal: Float32Array;
  gridSize: number;
  field: Float32Array;
  densityRange: number;
}): ArrayBuffer {
  const n = input.surface + input.interior + input.brain;
  const buf = new ArrayBuffer(figureByteLength(n, input.surface, input.gridSize));
  const view = new DataView(buf);
  for (let i = 0; i < 4; i++) view.setUint8(i, FIGURE_MAGIC.charCodeAt(i));
  view.setUint16(4, FIGURE_VERSION, true);
  view.setUint16(6, input.gridSize, true);
  view.setUint32(8, input.surface, true);
  view.setUint32(12, input.interior, true);
  view.setUint32(16, input.brain, true);
  view.setFloat32(20, input.densityRange, true);

  const { centre, half } = boundsTransform();
  const pos = new Int16Array(buf, FIGURE_HEADER_BYTES, n * 3);
  for (let i = 0; i < n * 3; i++) {
    const axis = i % 3;
    const v = (input.position[i]! - centre[axis]!) / half[axis]!;
    pos[i] = Math.round(Math.max(-1, Math.min(1, v)) * 32767);
  }
  const nor = new Int8Array(buf, FIGURE_HEADER_BYTES + n * 6, input.surface * 3);
  for (let i = 0; i < nor.length; i++) nor[i] = Math.round(Math.max(-1, Math.min(1, input.normal[i]!)) * 127);
  const den = new Int8Array(buf, FIGURE_HEADER_BYTES + n * 6 + input.surface * 3, input.gridSize ** 3);
  for (let i = 0; i < den.length; i++) {
    den[i] = Math.round(Math.max(-1, Math.min(1, input.field[i]! / input.densityRange)) * 127);
  }
  return buf;
}

export function decodeFigure(buf: ArrayBuffer): FigureFile {
  const view = new DataView(buf);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== FIGURE_MAGIC) throw new Error('figure file: bad magic');
  const version = view.getUint16(4, true);
  if (version !== FIGURE_VERSION) throw new Error(`figure file: unsupported version ${String(version)}`);
  const gridSize = view.getUint16(6, true);
  const surface = view.getUint32(8, true);
  const interior = view.getUint32(12, true);
  const brain = view.getUint32(16, true);
  const densityRange = view.getFloat32(20, true);
  const n = surface + interior + brain;
  if (buf.byteLength !== figureByteLength(n, surface, gridSize)) throw new Error('figure file: truncated');
  return {
    version,
    gridSize,
    surface,
    interior,
    brain,
    densityRange,
    positions: new Int16Array(buf, FIGURE_HEADER_BYTES, n * 3),
    normals: new Int8Array(buf, FIGURE_HEADER_BYTES + n * 6, surface * 3),
    density: new Int8Array(buf, FIGURE_HEADER_BYTES + n * 6 + surface * 3, gridSize ** 3),
  };
}

/** Bounds used for position quantization, re-exported for the renderer. */
export { BODY_BOUNDS };
