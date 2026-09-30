/**
 * The hero figure: its geometry, and the pre-built file the renderer streams.
 *
 * The figure is generated once at build time (`npm run hero:geometry`) and
 * committed. These tests hold the model to its promises — points on the
 * surface, networks inside the body, deterministic output — and check that the
 * committed file is readable and matches the model's current bounds, so a
 * change to the body that is not followed by a rebuild fails here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BODY_BOUNDS,
  bodySdf,
  BRAIN,
  buildNetwork,
  buildStory,
  HEART,
  runNow,
  sampleFigure,
} from '@/components/showcase/hero/body-model';
import { decodeFigure, encodeFigure, FIGURE_URL } from '@/components/showcase/hero/figure-format';

describe('body model', () => {
  const small = runNow(sampleFigure({ surface: 400, interior: 100, brain: 50 }));

  it('places surface particles on the surface', () => {
    for (let i = 0; i < 400; i++) {
      const d = bodySdf(small.position[i * 3]!, small.position[i * 3 + 1]!, small.position[i * 3 + 2]!);
      expect(Math.abs(d)).toBeLessThan(0.013);
    }
  });

  it('places interior particles inside the body', () => {
    for (let i = 400; i < 500; i++) {
      expect(bodySdf(small.position[i * 3]!, small.position[i * 3 + 1]!, small.position[i * 3 + 2]!)).toBeLessThan(0);
    }
  });

  it('is deterministic', () => {
    const again = runNow(sampleFigure({ surface: 400, interior: 100, brain: 50 }));
    expect(Array.from(again.position.slice(0, 60))).toEqual(Array.from(small.position.slice(0, 60)));
  });

  it('keeps the heart and the brain inside the body, and the body inside its bounds', () => {
    expect(bodySdf(...HEART)).toBeLessThan(0);
    expect(bodySdf(...BRAIN)).toBeLessThan(0);
    for (let i = 0; i < small.count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        const v = small.position[i * 3 + axis]!;
        expect(v).toBeGreaterThan(BODY_BOUNDS.min[axis]!);
        expect(v).toBeLessThan(BODY_BOUNDS.max[axis]!);
      }
    }
  });

  it('runs the neural and vascular networks inside the body', () => {
    const net = buildNetwork();
    let outside = 0;
    for (let i = 0; i < net.position.length; i += 3) {
      if (bodySdf(net.position[i]!, net.position[i + 1]!, net.position[i + 2]!) > 0.02) outside++;
    }
    expect(outside / (net.position.length / 3)).toBeLessThan(0.02);
    expect(Math.max(...net.dist)).toBeLessThanOrEqual(1);
  });

  it('builds story targets of the requested size', () => {
    const story = runNow(buildStory(500, buildNetwork()));
    for (const arr of [story.helix, story.membrane, story.network, story.helixColor, story.membraneColor, story.networkColor]) {
      expect(arr.length).toBe(1500);
      expect(arr.every(Number.isFinite)).toBe(true);
    }
  });
});

describe('figure file', () => {
  it('round-trips through the format', () => {
    const fig = runNow(sampleFigure({ surface: 30, interior: 10, brain: 5 }));
    const field = new Float32Array(8 ** 3).map((_, i) => ((i % 7) - 3) / 10);
    const buf = encodeFigure({ surface: 30, interior: 10, brain: 5, position: fig.position, normal: fig.normal, gridSize: 8, field, densityRange: 0.25 });
    const file = decodeFigure(buf);
    expect([file.surface, file.interior, file.brain, file.gridSize]).toEqual([30, 10, 5, 8]);
    expect(file.normals.length).toBe(90);
    expect(file.density[3]).toBe(0);
  });

  it('rejects a truncated file', () => {
    const fig = runNow(sampleFigure({ surface: 3, interior: 1, brain: 1 }));
    const buf = encodeFigure({ surface: 3, interior: 1, brain: 1, position: fig.position, normal: fig.normal, gridSize: 4, field: new Float32Array(64), densityRange: 0.25 });
    expect(() => decodeFigure(buf.slice(0, buf.byteLength - 1))).toThrow(/truncated/);
  });

  it('the committed file is readable and matches the model', () => {
    const bytes = readFileSync(join(process.cwd(), 'public', FIGURE_URL));
    const file = decodeFigure(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    expect(file.surface).toBeGreaterThan(10000);
    // Spot-check: decoded surface points sit on the current model's surface.
    const { min, max } = BODY_BOUNDS;
    for (let i = 0; i < 200; i++) {
      const p = [0, 1, 2].map((a) => {
        const c = (min[a]! + max[a]!) / 2;
        const h = (max[a]! - min[a]!) / 2;
        return c + (file.positions[i * 3 + a]! / 32767) * h;
      }) as [number, number, number];
      expect(Math.abs(bodySdf(...p)), 'rebuild with `npm run hero:geometry`').toBeLessThan(0.02);
    }
  });
});
