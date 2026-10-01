/**
 * Art-directed compositions of the hero scene, rendered once to stills for the
 * page's lower sections (`npm run hero:stills`, dev server only).
 *
 * The page stays dimensional below the hero without a second live canvas: each
 * section's image is a frame of this same scene — the same figure, peptide,
 * receptors and light — composed for its section. One visual language, no
 * runtime cost.
 */

type V3 = readonly [number, number, number];

export interface ShotSpec {
  /** Output size of the still, in CSS pixels at the capture's device scale. */
  readonly size: readonly [number, number];
  /** Scroll progress whose choreography the shot starts from. */
  readonly p: number;
  /** Fixed scene time, so the frame is reproducible. */
  readonly time: number;
  readonly camera: V3;
  readonly look: V3;
  readonly fov?: number;
  readonly bodyYaw: number;
  readonly show: { readonly body: boolean; readonly story: boolean; readonly molecule: boolean; readonly motes: boolean };
  readonly overrides?: {
    readonly uAB?: number;
    readonly uBC?: number;
    readonly activate?: number;
    readonly wave?: number;
    readonly reveal?: number;
    readonly moleculeOpacity?: number;
  };
  /** World point held in focus, and how shallow the depth of field is. */
  readonly focus: V3;
  readonly aperture: number;
  readonly helixAt?: V3;
  readonly membraneAt?: V3;
  readonly helixScale?: number;
}

export const SHOTS = {
  /** A human in profile, head and shoulders, the neural field lit. */
  profile: {
    size: [1600, 1200],
    p: 1,
    time: 21,
    camera: [0.35, 3.85, 3.9],
    look: [0.05, 3.75, 0],
    fov: 30,
    bodyYaw: -1.42,
    show: { body: true, story: true, molecule: false, motes: true },
    focus: [0, 4.2, 0],
    aperture: 0.06,
  },
  /** The peptide, close enough to see its atoms. */
  molecule: {
    size: [1600, 1200],
    p: 0,
    time: 9,
    camera: [0.25, 0.35, 3.3],
    look: [0.05, 0, 0],
    fov: 32,
    bodyYaw: 0,
    // the solid alone: the particle skin reads as glitter this close
    show: { body: false, story: false, molecule: true, motes: true },
    overrides: { moleculeOpacity: 1 },
    focus: [0, 0, 0.3],
    aperture: 0.16,
    helixAt: [0, 0, 0],
    helixScale: 1.25,
  },
  /** Receptors held in a membrane, ligands docked. */
  receptors: {
    size: [1600, 1200],
    p: 0.44,
    time: 13,
    camera: [0.9, 1.35, 3.0],
    look: [0.1, 0.1, 0],
    fov: 34,
    bodyYaw: 0,
    show: { body: false, story: true, molecule: false, motes: true },
    overrides: { uAB: 1, uBC: 0 },
    focus: [0.2, 0.2, 0.3],
    aperture: 0.14,
    membraneAt: [0, 0, 0],
  },
  /** A hand at rest, the body's pathways running into it. */
  hand: {
    size: [1600, 1200],
    p: 1,
    time: 17,
    camera: [-0.35, 0.95, 2.35],
    look: [-1.1, 0.45, 0.15],
    fov: 32,
    bodyYaw: -0.32,
    show: { body: true, story: true, molecule: false, motes: true },
    focus: [-1.25, 0.4, 0.25],
    aperture: 0.1,
  },
  /** Everything at once: the peptide, the receptors, the signal, the person. */
  connect: {
    size: [2000, 1000],
    p: 0.7,
    time: 16,
    camera: [-0.9, 2.55, 9.2],
    look: [-0.9, 2.3, 0],
    fov: 34,
    bodyYaw: -1.05,
    show: { body: true, story: true, molecule: true, motes: true },
    overrides: { uAB: 1, uBC: 0.4, activate: 0.8, wave: 5.5, reveal: 0.5, moleculeOpacity: 1 },
    focus: [-1.4, 2.3, 1.2],
    aperture: 0.03,
    helixAt: [-4.3, 2.9, 2.4],
    membraneAt: [-2.2, 2.2, 1.2],
    helixScale: 1.1,
  },
} as const satisfies Record<string, ShotSpec>;

export type ShotName = keyof typeof SHOTS;

export function isShotName(name: string | null): name is ShotName {
  return name !== null && Object.prototype.hasOwnProperty.call(SHOTS, name);
}
