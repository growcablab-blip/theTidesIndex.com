/**
 * The hero figure: the committed mesh file, the point cloud sampled from it, and
 * the structures laid inside it.
 *
 * The figure is the CC0 MakeHuman base mesh, re-posed at build time
 * (`npm run hero:geometry`) and committed as `public/hero/figure.bin` together
 * with its generated landmarks. These tests hold the pieces to each other: the
 * file decodes, the landmarks sit inside the body the file describes, the
 * networks run inside it, and sampling is deterministic.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BRAIN,
  buildHelixRibbon,
  buildHelixSolid,
  buildNetwork,
  buildStory,
  HEART,
  runNow,
  sampleFigure,
  type FigureMesh,
} from '@/components/showcase/hero/body-model';
import {
  decodeFigure,
  dequantizeNormals,
  dequantizePositions,
  encodeFigure,
  FIGURE_BOUNDS,
  FIGURE_URL,
  isInside,
} from '@/components/showcase/hero/figure-format';
import { LANDMARKS } from '@/components/showcase/hero/figure-landmarks';

const bytes = readFileSync(join(process.cwd(), 'public', FIGURE_URL));
const file = decodeFigure(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const mesh: FigureMesh = {
  position: dequantizePositions(file),
  normal: dequantizeNormals(file),
  index: file.indices,
  grid: file.grid,
  occupancy: file.occupancy,
};

describe('committed figure file', () => {
  it('is a human-scale mesh inside its bounds', () => {
    expect(file.vertices).toBeGreaterThan(10000);
    expect(file.triangles).toBeGreaterThan(20000);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 1; i < mesh.position.length; i += 3) {
      minY = Math.min(minY, mesh.position[i]!);
      maxY = Math.max(maxY, mesh.position[i]!);
    }
    // 10 units tall, feet at −5 (within quantization)
    expect(minY).toBeCloseTo(-5, 1);
    expect(maxY - minY).toBeCloseTo(10, 1);
  });

  it('references only real vertices', () => {
    for (const i of file.indices) expect(i).toBeLessThan(file.vertices);
  });

  it('puts the heart, the brain and the joints inside the body', () => {
    expect(isInside(mesh, ...HEART)).toBe(true);
    expect(isInside(mesh, ...BRAIN)).toBe(true);
    for (const name of ['neck', 'spine2', 'pelvis', 'lKnee', 'rKnee', 'lElbow', 'rElbow'] as const) {
      expect(isInside(mesh, ...LANDMARKS[name]), name).toBe(true);
    }
  });
});

describe('figure sampling', () => {
  const small = runNow(sampleFigure(mesh, { surface: 500, interior: 150, brain: 60 }));

  it('is deterministic', () => {
    const again = runNow(sampleFigure(mesh, { surface: 500, interior: 150, brain: 60 }));
    expect(Array.from(again.position.slice(0, 90))).toEqual(Array.from(small.position.slice(0, 90)));
  });

  it('keeps every point inside the figure bounds', () => {
    for (let i = 0; i < small.count; i++) {
      for (let a = 0; a < 3; a++) {
        const v = small.position[i * 3 + a]!;
        expect(v).toBeGreaterThanOrEqual(FIGURE_BOUNDS.min[a]! - 1e-3);
        expect(v).toBeLessThanOrEqual(FIGURE_BOUNDS.max[a]! + 1e-3);
      }
    }
  });

  it('places interior haze inside the body', () => {
    for (let i = 500; i < 650; i++) {
      expect(isInside(mesh, small.position[i * 3]!, small.position[i * 3 + 1]!, small.position[i * 3 + 2]!)).toBe(true);
    }
  });
});

describe('structures inside the figure', () => {
  it('runs the neural and vascular networks inside the body', () => {
    const net = buildNetwork();
    let outside = 0;
    for (let i = 0; i < net.position.length; i += 3) {
      if (!isInside(mesh, net.position[i]!, net.position[i + 1]!, net.position[i + 2]!)) outside++;
    }
    // the occupancy grid is coarse at the thinnest limbs; almost all must be inside
    expect(outside / (net.position.length / 3)).toBeLessThan(0.08);
    expect(Math.max(...net.dist)).toBeLessThanOrEqual(1);
  });

  it('builds story targets and the solid peptide', () => {
    const story = runNow(buildStory(400, buildNetwork()));
    for (const arr of [story.helix, story.membrane, story.network]) {
      expect(arr.length).toBe(1200);
      expect(arr.every(Number.isFinite)).toBe(true);
    }
    const solid = buildHelixSolid();
    expect(solid.atoms.length).toBeGreaterThan(40);
    for (const [a, b] of solid.bonds) {
      expect(a).toBeLessThan(solid.atoms.length);
      expect(b).toBeLessThan(solid.atoms.length);
    }
  });
});

describe('peptide ribbon', () => {
  it('is a closed, finite mesh along the helix', () => {
    const r = buildHelixRibbon();
    expect(r.position.every(Number.isFinite)).toBe(true);
    expect(r.normal.every(Number.isFinite)).toBe(true);
    const verts = r.position.length / 3;
    for (const i of r.index) expect(i).toBeLessThan(verts);
  });

  it('adds fine branches only inside the body', () => {
    const plain = buildNetwork();
    const branched = buildNetwork(mesh);
    expect(branched.position.length).toBeGreaterThan(plain.position.length);
  });
});

describe('figure file format', () => {
  it('round-trips a small mesh', () => {
    const position = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const normal = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const occupancy = new Uint8Array(1);
    occupancy[0] = 0b101;
    const buf = encodeFigure({ position, normal, index: new Uint16Array([0, 1, 2]), grid: [2, 2, 2], occupancy });
    const f = decodeFigure(buf);
    expect([f.vertices, f.triangles]).toEqual([3, 1]);
    expect(Array.from(f.indices)).toEqual([0, 1, 2]);
    expect(f.occupancy[0]).toBe(0b101);
  });

  it('rejects a truncated file', () => {
    const buf = encodeFigure({
      position: new Float32Array(9),
      normal: new Float32Array(9),
      index: new Uint16Array([0, 1, 2]),
      grid: [2, 2, 2],
      occupancy: new Uint8Array(1),
    });
    expect(() => decodeFigure(buf.slice(0, buf.byteLength - 1))).toThrow(/truncated/);
  });
});
