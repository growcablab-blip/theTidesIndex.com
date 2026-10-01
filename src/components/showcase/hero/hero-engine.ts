/**
 * The hero renderer.
 *
 * One WebGL canvas and one progress value `p` (0…1) driven by scroll through the
 * pinned hero:
 *
 *   0.00  arrival        too close to a lit peptide helix floating in front of the
 *                        figure; the body is dormant — rim light and a scan line
 *   0.12  receptors      the peptide loosens and re-forms as receptors in a
 *                        membrane
 *   0.46  signal         the particles stream into the body through the heart and
 *                        settle along its neural and vascular paths
 *   0.60  response       a wave of light spreads from the heart; the networks and
 *                        the neural cluster come alive
 *   1.00  the system     the camera has pulled back to the whole figure, lit
 *
 * Plain three.js on purpose: a backdrop, the figure's particles, a marching-cubes
 * shell, one line draw for every network, the story particles, two glows and a
 * few out-of-focus motes. No post-processing, nothing kept alive while hidden.
 *
 * The engine owns pixels only. Every word on the hero is DOM; the engine reports
 * where its labels' anchors are and nothing else.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ATOM_KIND,
  BRAIN,
  buildBrainLinks,
  buildHelixSolid,
  buildNetwork,
  buildStory,
  HEART,
  mulberry32,
  sampleFigure,
  type FigureMesh,
  type FigureParticles,
  type StoryTargets,
  type Work,
} from './body-model';
import { decodeFigure, dequantizeNormals, dequantizePositions, FIGURE_URL } from './figure-format';
import type { TierBudget } from './hero-tier';
import type { ShotSpec } from './hero-shots';
import {
  BACKDROP_FRAG,
  BACKDROP_VERT,
  FIGURE_VERT,
  GLOW_FRAG,
  GLOW_VERT,
  LINE_FRAG,
  MOTE_FRAG,
  MOTE_VERT,
  NETWORK_VERT,
  POINT_FRAG,
  SHELL_FRAG,
  SHELL_VERT,
  STORY_VERT,
} from './hero-shaders';

/** A label anchor projected to the canvas, in CSS pixels. */
export interface LabelFrame {
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

export interface HeroPerf {
  fps: number;
  frameMs: number;
  dpr: number;
  drawCalls: number;
  qualitySteps: number;
  ready: boolean;
}

interface Options {
  tier: TierBudget;
  /** Render a fixed, fully resolved frame for the static still (review tooling only). */
  poster?: boolean;
  /** Render a fixed art-directed composition for a section still (review tooling only). */
  shot?: ShotSpec | undefined;
  onReady: () => void;
  onFrame?: ((labels: readonly LabelFrame[], p: number) => void) | undefined;
  onContextLost: () => void;
}

const FOV = 35;
const ss = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
type Key = readonly [number, number];
/** Piecewise-smooth keyframes. */
function track(keys: readonly Key[], t: number): number {
  const first = keys[0]!;
  if (t <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]!;
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]!;
      return v0 + (v1 - v0) * ss(t0, t1, t);
    }
  }
  return keys[keys.length - 1]![1];
}

/*
 * The camera, per orientation. Landscape keeps the figure right of the headline
 * with a lens shift (the projection moves, the camera does not turn); portrait
 * lifts the subject above the copy.
 */
const CAM = {
  landscape: {
    x: [[0, 1.3], [0.45, 1.25], [0.75, 0.4], [1, 0]],
    y: [[0, 2.35], [0.45, 2.15], [0.75, 1.4], [1, 0.45]],
    z: [[0, 11.4], [0.45, 12.6], [0.75, 15.5], [1, 19]],
    lx: [[0, 1.0], [0.45, 1.3], [0.75, 0.3], [1, 0]],
    ly: [[0, 2.0], [0.45, 1.95], [0.75, 1.3], [1, 0.2]],
    lz: [[0, 1.6], [0.45, 1.0], [0.75, 0.4], [1, 0]],
    shiftX: [[0, -0.38], [0.45, -0.34], [0.75, -0.28], [1, -0.2]],
    shiftY: [[0, 0], [1, 0]],
  },
  portrait: {
    x: [[0, 0.55], [0.45, 0.65], [0.75, 0.25], [1, 0]],
    y: [[0, 2.9], [0.45, 2.7], [0.75, 1.6], [1, 0.5]],
    z: [[0, 13.5], [0.45, 14.5], [0.75, 18], [1, 22]],
    lx: [[0, 0.45], [0.45, 0.55], [0.75, 0.2], [1, 0]],
    ly: [[0, 2.7], [0.45, 2.5], [0.75, 1.3], [1, 0.2]],
    lz: [[0, 1.4], [0.45, 1.0], [0.75, 0.4], [1, 0]],
    shiftX: [[0, 0], [1, 0]],
    shiftY: [[0, -0.34], [0.45, -0.3], [0.75, -0.16], [1, -0.06]],
  },
} as const satisfies Record<string, Record<string, readonly Key[]>>;

/**
 * Where the peptide and the membrane float. Landscape: beside and in front of
 * the figure, clear of the headline. Portrait: up by the shoulder, above the
 * copy, which sits in the lower half of a phone screen.
 */
const PLACES = {
  landscape: { helix: new THREE.Vector3(1.95, 1.5, 3.9), membrane: new THREE.Vector3(2.75, 1.75, 1.5), scale: 1 },
  // beside the chest, clear of the face and the header on a tall, narrow screen
  portrait: { helix: new THREE.Vector3(1.35, 2.2, 3.1), membrane: new THREE.Vector3(1.35, 2.9, 1.6), scale: 0.72 },
} as const;

/** The peptide is shown larger than life, so it reads as an object with depth. */
const HELIX_SCALE = 1.08;
const HELIX_LABEL_OFFSET = new THREE.Vector3(0.35, 1.9, 0);
const MEMBRANE_LABEL_OFFSET = new THREE.Vector3(0.9, 1.35, 0.3);

/** Label anchors: two in world space for the story, three on the body. */
const BODY_ANCHORS: readonly (readonly [number, number, number])[] = [
  [0.3, 4.62, 0.35], // neural
  [-1.48, 1.4, 0.16], // vascular
  [0.5, 1.0, 0.5], // cellular
];

export class HeroEngine {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  private readonly body = new THREE.Group();
  private readonly canvas: HTMLCanvasElement;
  private readonly opts: Options;
  private readonly budget: TierBudget;

  private backdrop!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private figure?: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private shellMat?: THREE.ShaderMaterial;
  private network?: THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private story?: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private glows?: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private motes?: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private molecule?: THREE.Group;
  private readonly moleculeMats: THREE.MeshStandardMaterial[] = [];

  private readonly helixM = new THREE.Matrix4();
  private readonly memM = new THREE.Matrix4();
  private readonly heartW = new THREE.Vector3();
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpE = new THREE.Euler();
  private readonly spin = new THREE.Quaternion();
  private readonly helixAt = new THREE.Vector3();
  private readonly membraneAt = new THREE.Vector3();
  private static readonly UP = new THREE.Vector3(0, 1, 0);

  private pTarget = 0;
  private p = 0;
  private time = 0;
  private intro = 0;
  private ready = false;
  private running = false;
  private visible = true;
  private disposed = false;
  private raf = 0;
  private last = 0;
  private portrait = false;
  private cssW = 1;
  private cssH = 1;
  private readonly pointer = new THREE.Vector2();
  private readonly pointerSmooth = new THREE.Vector2();

  // quality
  private dprScale = 1;
  private storyCount = 0;
  private storyDraw = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private fpsWindowStart = 0;
  private badWindows = 0;
  readonly perf: HeroPerf = { fps: 0, frameMs: 0, dpr: 1, drawCalls: 0, qualitySteps: 0, ready: false };

  private io?: IntersectionObserver;
  private readonly disposers: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement, opts: Options) {
    this.canvas = canvas;
    this.opts = opts;
    this.budget = opts.tier;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: opts.poster === true || opts.shot !== undefined,
    });
    this.renderer.setClearColor(0x030c13, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.add(this.body);
    this.buildBackdrop();
    this.bind();
    this.resize();
    void this.boot();
  }

  // ───────────────────────────── construction ─────────────────────────────

  private additive(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  private buildBackdrop() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: BACKDROP_VERT,
      fragmentShader: BACKDROP_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: { uFocus: { value: new THREE.Vector2(0.7, 0.55) }, uAspect: { value: 1 }, uGlow: { value: 1 } },
    });
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.backdrop.frustumCulled = false;
    this.backdrop.renderOrder = -10;
    this.scene.add(this.backdrop);
  }

  /** Spread generator work across frames: never more than ~8 ms at a time. */
  private async drain<T>(work: Work<T>): Promise<T> {
    let sliceStart = performance.now();
    for (;;) {
      const step = work.next();
      if (step.done === true) return step.value;
      if (performance.now() - sliceStart > 8) {
        await new Promise((r) => setTimeout(r, 0));
        if (this.disposed) throw new Error('disposed');
        sliceStart = performance.now();
      }
    }
  }

  private async boot() {
    try {
      const res = await fetch(FIGURE_URL);
      if (!res.ok) throw new Error(`figure: ${String(res.status)}`);
      const file = decodeFigure(await res.arrayBuffer());
      if (this.disposed) return;
      const mesh: FigureMesh = {
        position: dequantizePositions(file),
        normal: dequantizeNormals(file),
        index: file.indices,
        grid: file.grid,
        occupancy: file.occupancy,
      };
      this.buildShell(mesh);
      this.buildMolecule();
      const b = this.budget;
      this.buildFigure(await this.drain(sampleFigure(mesh, { surface: b.surface, interior: b.interior, brain: b.brain })));
      this.buildGlows();
      this.buildMotes();
      const network = buildNetwork();
      this.buildNetwork(network);
      this.ready = true;
      this.perf.ready = true;
      this.opts.onReady();
      this.start();
      // Second wave, after the first frames are on screen.
      const story = await this.drain(buildStory(this.budget.story, network));
      this.buildStory(story);
    } catch (error) {
      if (!this.disposed) {
        console.error('[hero] failed to start', error);
        this.opts.onContextLost();
      }
    }
  }

  private buildFigure(f: FigureParticles) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(f.position, 3));
    geo.setAttribute('aNormal', new THREE.BufferAttribute(f.normal, 3));
    geo.setAttribute('aKind', new THREE.BufferAttribute(f.kind, 1));
    geo.setAttribute('aRand', new THREE.BufferAttribute(f.rand, 4));
    const mat = this.additive(FIGURE_VERT, POINT_FRAG, {
      uTime: { value: 0 },
      uPx: { value: 1 },
      uMaxPx: { value: 20 },
      uIntro: { value: 0 },
      uActivate: { value: 0 },
      uWave: { value: 0 },
      uScanY: { value: 0 },
      uCentreDepth: { value: 10 },
      uHeart: { value: new THREE.Vector3(...HEART) },
      uFocus: { value: 10 },
      uAperture: { value: 0 },
    });
    this.figure = new THREE.Points(geo, mat);
    this.figure.frustumCulled = false;
    this.figure.renderOrder = 2;
    this.body.add(this.figure);
    this.updatePx();
  }

  /** The body as glass: the mesh itself, read through its fresnel rim. */
  private buildShell(mesh: FigureMesh) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(mesh.position, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(mesh.normal, 3));
    geo.setIndex(new THREE.BufferAttribute(mesh.index, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uIntro: { value: 0 },
        uActivate: { value: 0 },
        uWave: { value: 0 },
        uScanY: { value: 0 },
        uTime: { value: 0 },
        uHeart: { value: new THREE.Vector3(...HEART) },
      },
    });
    const shell = new THREE.Mesh(geo, mat);
    shell.frustumCulled = false;
    shell.renderOrder = 1;
    this.shellMat = mat;
    this.body.add(shell);
  }

  /**
   * The peptide as a physical object: lit spheres for its atoms and thin bonds
   * between them, reflecting a soft studio environment. The particle helix is
   * its skin of light; when the story moves on, the solid dissolves first.
   */
  private buildMolecule() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xe8f6ff, 2.2);
    key.position.set(-3, 5, 6);
    const rim = new THREE.DirectionalLight(0x22d3ee, 3.0);
    rim.position.set(4, 1, -5);
    this.scene.add(key, rim, new THREE.AmbientLight(0x10324a, 0.6));

    const solid = buildHelixSolid();
    const group = new THREE.Group();
    group.matrixAutoUpdate = false;

    const atomMat = new THREE.MeshStandardMaterial({ metalness: 0.7, roughness: 0.18, envMap: env, envMapIntensity: 1.0, transparent: true });
    const atoms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), atomMat, solid.atoms.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    // graphite and glass; colour only as a signal
    const SIDE = ['#8fb9c3', '#8fb9c3', '#4f5fb8', '#8fb9c3', '#1f8d9e'];
    solid.atoms.forEach(([x, y, z, r, k], i) => {
      m.makeScale(r, r, r).setPosition(x, y, z);
      atoms.setMatrixAt(i, m);
      c.set(k === ATOM_KIND.backbone ? '#1a2a34' : k === ATOM_KIND.alpha ? '#135f6c' : SIDE[i % SIDE.length]!);
      atoms.setColorAt(i, c);
    });

    const bondMat = new THREE.MeshStandardMaterial({ color: 0x4f9aa6, emissive: 0x0a3a42, emissiveIntensity: 0.35, metalness: 0.5, roughness: 0.3, envMap: env, transparent: true });
    const bonds = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), bondMat, solid.bonds.length);
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    solid.bonds.forEach(([i, j], n) => {
      const pa = solid.atoms[i]!;
      const pb = solid.atoms[j]!;
      a.set(pa[0], pa[1], pa[2]);
      b.set(pb[0], pb[1], pb[2]);
      const dir = b.clone().sub(a);
      q.setFromUnitVectors(up, dir.clone().normalize());
      m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(0.022, dir.length(), 0.022));
      bonds.setMatrixAt(n, m);
    });

    atoms.frustumCulled = false;
    bonds.frustumCulled = false;
    atoms.renderOrder = 3;
    bonds.renderOrder = 3;
    group.add(atoms, bonds);
    this.moleculeMats.push(atomMat, bondMat);
    this.molecule = group;
    this.scene.add(group);
  }

  private buildNetwork(net: ReturnType<typeof buildNetwork>) {
    const brain = buildBrainLinks(this.budget.tier === 'a' ? 110 : 60);
    const nBrain = brain.length / 3;
    const pos = new Float32Array(net.position.length + brain.length);
    pos.set(net.position);
    pos.set(brain, net.position.length);
    const nv = net.position.length / 3;
    const dist = new Float32Array(nv + nBrain);
    const kind = new Float32Array(nv + nBrain);
    const seed = new Float32Array(nv + nBrain);
    dist.set(net.dist);
    kind.set(net.kind);
    seed.set(net.seed);
    const rand = mulberry32(7);
    for (let i = 0; i < nBrain; i++) {
      dist[nv + i] = 0.02 + rand() * 0.03;
      seed[nv + i] = rand();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aDist', new THREE.BufferAttribute(dist, 1));
    geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = this.additive(NETWORK_VERT, LINE_FRAG, {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uIntro: { value: 0 },
    });
    this.network = new THREE.LineSegments(geo, mat);
    this.network.frustumCulled = false;
    this.network.renderOrder = 3;
    this.body.add(this.network);
  }

  private buildStory(s: StoryTargets) {
    const geo = new THREE.BufferGeometry();
    const f3 = (a: Float32Array) => new THREE.BufferAttribute(a, 3);
    // `position` exists only so three has a vertex count; the shader ignores it.
    geo.setAttribute('position', f3(new Float32Array(s.count * 3)));
    geo.setAttribute('aHelix', f3(s.helix));
    geo.setAttribute('aMem', f3(s.membrane));
    geo.setAttribute('aNet', f3(s.network));
    geo.setAttribute('aColH', f3(s.helixColor));
    geo.setAttribute('aColM', f3(s.membraneColor));
    geo.setAttribute('aColN', f3(s.networkColor));
    geo.setAttribute('aRand', new THREE.BufferAttribute(s.rand, 4));
    this.storyCount = this.storyDraw = s.count;
    const mat = this.additive(STORY_VERT, POINT_FRAG, {
      uHelixM: { value: this.helixM },
      uMemM: { value: this.memM },
      uBodyM: { value: this.body.matrixWorld },
      uHeartW: { value: this.heartW },
      uAB: { value: 0 },
      uBC: { value: 0 },
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uPx: { value: 1 },
      uMaxPx: { value: 20 },
      uReveal: { value: 0 },
      uFocus: { value: 10 },
      uAperture: { value: 0 },
    });
    this.story = new THREE.Points(geo, mat);
    this.story.frustumCulled = false;
    this.story.renderOrder = 4;
    this.scene.add(this.story);
    // The story condenses on its own clock, so arriving late never looks late.
    this.storyIntroStart = this.time;
    this.updatePx();
  }
  private storyIntroStart = 0;

  private buildGlows() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...HEART, ...BRAIN]), 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array([1.5, 2.1]), 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array([0.75, 0.97, 1.0, 0.6, 0.55, 1.0]), 3));
    const mat = this.additive(GLOW_VERT, GLOW_FRAG, {
      uPx: { value: 1 },
      uMaxPx: { value: 20 },
      uTime: { value: 0 },
      uStrength: { value: 0 },
    });
    this.glows = new THREE.Points(geo, mat);
    this.glows.frustumCulled = false;
    this.glows.renderOrder = 5;
    this.body.add(this.glows);
  }

  private buildMotes() {
    const n = this.budget.motes;
    const rand = mulberry32(31);
    const pos = new Float32Array(n * 3);
    const r2 = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      pos.set([(rand() - 0.5) * 16, (rand() - 0.5) * 10, -1.6 - rand() * 7], i * 3);
      r2.set([rand(), rand()], i * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aR', new THREE.BufferAttribute(r2, 2));
    const mat = this.additive(MOTE_VERT, MOTE_FRAG, {
      uTime: { value: 0 },
      uPx: { value: 1 },
      uAlpha: { value: 0 },
      uDrift: { value: new THREE.Vector2() },
    });
    this.motes = new THREE.Points(geo, mat);
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 8;
    this.camera.add(this.motes);
    this.scene.add(this.camera);
  }

  // ───────────────────────────── input and lifecycle ─────────────────────────────

  private bind() {
    const on = (target: EventTarget, type: string, fn: EventListener, o?: AddEventListenerOptions) => {
      target.addEventListener(type, fn, o);
      this.disposers.push(() => target.removeEventListener(type, fn, o));
    };
    on(
      window,
      'pointermove',
      ((e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
      }) as EventListener,
      { passive: true },
    );
    on(window, 'resize', () => this.resize());
    on(document, 'visibilitychange', () => this.syncRunning());
    on(this.canvas, 'webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
      this.opts.onContextLost();
    });
    this.io = new IntersectionObserver(([entry]) => {
      this.visible = entry?.isIntersecting ?? true;
      this.syncRunning();
    });
    this.io.observe(this.canvas);
  }

  setProgress(p: number) {
    this.pTarget = Math.min(1, Math.max(0, p));
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = Math.max(1, parent?.clientWidth ?? window.innerWidth);
    const h = Math.max(1, parent?.clientHeight ?? window.innerHeight);
    this.cssW = w;
    this.cssH = h;
    this.portrait = w / h < 0.9;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const dpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, this.budget.maxDpr) * this.dprScale);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.perf.dpr = Number(dpr.toFixed(2));
    this.backdrop.material.uniforms.uAspect!.value = w / h;
    this.updatePx();
  }

  private updatePx() {
    const px = (this.renderer.domElement.height * 0.5) / Math.tan((FOV * Math.PI) / 360);
    const maxPx = this.budget.maxPointPx * this.renderer.getPixelRatio();
    for (const m of [this.figure?.material, this.story?.material, this.glows?.material, this.motes?.material]) {
      if (m === undefined) continue;
      if (m.uniforms.uPx) m.uniforms.uPx.value = px;
      if (m.uniforms.uMaxPx) m.uniforms.uMaxPx.value = maxPx;
    }
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.io?.disconnect();
    this.disposers.forEach((d) => d());
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
    this.renderer.dispose();
  }

  private syncRunning() {
    if (this.ready && this.visible && !document.hidden) this.start();
    else this.stop();
  }

  private start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    this.fpsWindowStart = this.last;
    this.fpsAcc = 0;
    this.fpsFrames = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private readonly frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dtMs = now - this.last;
    this.last = now;
    // A stall (tab switch, debugger) is not a slow frame; do not let it judge the device.
    const stalled = dtMs > 250;
    const dt = Math.min(0.05, dtMs / 1000);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    if (stalled || this.opts.poster === true) return;
    this.fpsAcc += dtMs;
    this.fpsFrames++;
    if (now - this.fpsWindowStart >= 1000) {
      const avg = this.fpsAcc / this.fpsFrames;
      this.perf.frameMs = Number(avg.toFixed(1));
      this.perf.fps = Math.round(1000 / avg);
      this.perf.drawCalls = this.renderer.info.render.calls;
      this.adapt(this.perf.fps);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
      this.fpsWindowStart = now;
    }
  };

  /**
   * Step quality down after two consecutive one-second windows under 42 fps:
   * resolution first, then story particles. Never steps back up — no oscillation.
   */
  private adapt(fps: number) {
    if (this.intro < 1) return;
    if (fps >= 42) {
      this.badWindows = 0;
      return;
    }
    if (++this.badWindows < 2) return;
    this.badWindows = 0;
    if (this.renderer.getPixelRatio() > 0.8) {
      this.dprScale *= 0.8;
      this.perf.qualitySteps++;
      this.resize();
    } else if (this.story && this.storyDraw > this.storyCount * 0.4) {
      this.storyDraw = Math.floor(this.storyDraw * 0.75);
      this.story.geometry.setDrawRange(0, this.storyDraw);
      this.perf.qualitySteps++;
    }
  }

  // ───────────────────────────── the frame ─────────────────────────────

  private update(dt: number) {
    const shot = this.opts.shot;
    const poster = this.opts.poster === true || shot !== undefined;
    this.time = shot ? shot.time : poster ? 14 : this.time + dt;
    this.intro = poster ? 1 : Math.min(1, this.intro + dt / 2.6);
    // Scroll is followed, not mirrored: the damping is the difference between a
    // film and a slideshow dragged by hand.
    this.p = shot ? shot.p : poster ? 1 : this.p + (this.pTarget - this.p) * (1 - Math.exp(-dt * 5));
    const p = this.p;
    const t = this.time;
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3));
    const px = this.portrait || poster ? 0 : this.pointerSmooth.x;
    const py = this.portrait || poster ? 0 : this.pointerSmooth.y;

    // ── choreography
    // holds between the moves, so each state is seen before it changes
    const o = shot?.overrides;
    const uAB = o?.uAB ?? ss(0.14, 0.34, p);
    const uBC = o?.uBC ?? ss(0.5, 0.74, p);
    const activate = o?.activate ?? ss(0.64, 0.84, p);
    const wave = o?.wave ?? 11.5 * ss(0.64, 0.98, p);
    const reveal = o?.reveal ?? 1.05 * ss(0.66, 0.98, p);
    const scanY = Math.sin(t * 0.33) * 5.2;

    // ── the body: a slow, living turn
    this.body.rotation.y = shot ? shot.bodyYaw : Math.sin(t * 0.13) * 0.3 * (1 - activate * 0.4) + px * 0.22 + 0.12;
    this.body.position.y = Math.sin(t * 0.4) * 0.03;
    this.body.updateMatrixWorld();
    this.heartW.set(...HEART).applyMatrix4(this.body.matrixWorld);

    // ── camera
    const pm = this.camera.projectionMatrix;
    if (shot) {
      this.camera.fov = shot.fov ?? FOV;
      this.camera.position.set(...shot.camera);
      this.camera.lookAt(...shot.look);
      this.camera.updateMatrixWorld();
      this.camera.updateProjectionMatrix();
    } else {
      const cam = this.portrait ? CAM.portrait : CAM.landscape;
      const drift = poster ? 0 : 1;
      this.camera.position.set(
        track(cam.x, p) + px * 0.35 + drift * Math.sin(t * 0.21) * 0.06,
        track(cam.y, p) + py * 0.2 + drift * Math.cos(t * 0.17) * 0.05,
        track(cam.z, p),
      );
      this.camera.lookAt(track(cam.lx, p), track(cam.ly, p), track(cam.lz, p));
      this.camera.updateMatrixWorld();
      this.camera.updateProjectionMatrix();
      pm.elements[8] = track(cam.shiftX, p);
      pm.elements[9] = track(cam.shiftY, p);
      if (poster) {
        // The still sits under the copy for visitors without the sequence, so it
        // keeps the figure clear of the headline, as the opening frame does.
        pm.elements[8] = this.portrait ? 0 : -0.36;
        pm.elements[9] = this.portrait ? -0.12 : 0;
      }
    }
    this.camera.projectionMatrixInverse.copy(pm).invert();

    // ── the peptide and the membrane
    this.tmpE.set(0.35 + py * 0.15, t * 0.25 + px * 0.3, 0.85);
    this.tmpQ.setFromEuler(this.tmpE);
    this.tmpQ.multiply(this.spin.setFromAxisAngle(HeroEngine.UP, t * 0.45));
    const base = this.portrait ? PLACES.portrait : PLACES.landscape;
    const helixAt = shot?.helixAt ? this.helixAt.set(...shot.helixAt) : base.helix;
    const membraneAt = shot?.membraneAt ? this.membraneAt.set(...shot.membraneAt) : base.membrane;
    const place = { helix: helixAt, membrane: membraneAt };
    const dissolve = ss(0.12, 0.27, p);
    const hs = (shot?.helixScale ?? HELIX_SCALE * base.scale) * (1 - 0.2 * dissolve);
    this.helixM.compose(place.helix, this.tmpQ, this.tmpV.set(hs, hs, hs));
    if (this.molecule) {
      this.molecule.matrix.copy(this.helixM);
      this.molecule.matrixWorldNeedsUpdate = true;
      const opacity = o?.moleculeOpacity ?? (1 - dissolve) * ss(0.35, 1, this.intro);
      this.molecule.visible = opacity > 0.01 && (shot?.show.molecule ?? true);
      for (const mat of this.moleculeMats) mat.opacity = opacity;
    }
    this.tmpE.set(0.12 + Math.sin(t * 0.3) * 0.05, -0.25 + Math.sin(t * 0.23) * 0.08, 0.05);
    this.tmpQ.setFromEuler(this.tmpE);
    this.memM.compose(place.membrane, this.tmpQ, this.tmpV.set(1, 1, 1));
    if (shot) {
      this.body.visible = shot.show.body;
      if (this.story) this.story.visible = shot.show.story;
      if (this.motes) this.motes.visible = shot.show.motes;
    }

    // ── uniforms
    const centreDepth = this.camera.position.distanceTo(this.tmpV.set(0, 1, 0));
    // Focus pulls from the peptide to the body as the story moves into it.
    const focus = shot
      ? this.camera.position.distanceTo(this.tmpV.set(...shot.focus))
      : THREE.MathUtils.lerp(this.camera.position.distanceTo(place.helix), centreDepth, ss(0.28, 0.6, p));
    const aperture = shot ? shot.aperture : poster ? 0 : 0.012 + 0.075 * (1 - ss(0.78, 1, p));
    if (this.figure) {
      const u = this.figure.material.uniforms;
      u.uTime!.value = t;
      u.uIntro!.value = this.intro;
      u.uActivate!.value = activate;
      u.uWave!.value = wave;
      u.uScanY!.value = scanY;
      u.uCentreDepth!.value = centreDepth;
      u.uFocus!.value = focus;
      u.uAperture!.value = aperture;
    }
    if (this.shellMat) {
      const u = this.shellMat.uniforms;
      u.uIntro!.value = this.intro;
      u.uActivate!.value = activate;
      u.uWave!.value = wave;
      u.uScanY!.value = scanY;
      u.uTime!.value = t;
    }
    if (this.network) {
      const u = this.network.material.uniforms;
      u.uTime!.value = t;
      u.uReveal!.value = reveal;
      u.uIntro!.value = this.intro;
    }
    if (this.story) {
      const u = this.story.material.uniforms;
      u.uAB!.value = uAB;
      u.uBC!.value = uBC;
      u.uTime!.value = t;
      u.uIntro!.value = poster ? 1 : Math.min(1, (t - this.storyIntroStart) / 2.4);
      u.uReveal!.value = reveal;
      u.uFocus!.value = focus;
      u.uAperture!.value = aperture;
    }
    if (this.glows) {
      const u = this.glows.material.uniforms;
      u.uTime!.value = t;
      u.uStrength!.value = (0.18 + 0.82 * activate) * this.intro;
    }
    if (this.motes) {
      const u = this.motes.material.uniforms;
      u.uTime!.value = t;
      u.uAlpha!.value = this.intro * (1 - 0.5 * p);
      (u.uDrift!.value as THREE.Vector2).set(px * 0.03, py * 0.02);
    }

    // backdrop: the pool of light follows the figure's chest
    this.tmpV.set(0, 1.6, 0).applyMatrix4(this.body.matrixWorld).project(this.camera);
    const bu = this.backdrop.material.uniforms;
    (bu.uFocus!.value as THREE.Vector2).set(this.tmpV.x * 0.5 + 0.5, this.tmpV.y * 0.5 + 0.5);
    bu.uGlow!.value = 1 + activate * 0.8;

    this.reportLabels(p);
  }

  private reportLabels(p: number) {
    const cb = this.opts.onFrame;
    if (!cb) return;
    const out: LabelFrame[] = [];
    const project = (v: THREE.Vector3, alpha: number) => {
      v.project(this.camera);
      out.push({ x: (v.x * 0.5 + 0.5) * this.cssW, y: (-v.y * 0.5 + 0.5) * this.cssH, alpha: v.z < 1 ? alpha : 0 });
    };
    const intro = ss(0.6, 1, this.intro);
    const place = this.portrait ? PLACES.portrait : PLACES.landscape;
    project(this.tmpV.copy(place.helix).add(HELIX_LABEL_OFFSET), intro * (1 - ss(0.08, 0.16, p)));
    project(this.tmpV.copy(place.membrane).add(MEMBRANE_LABEL_OFFSET), ss(0.33, 0.4, p) * (1 - ss(0.5, 0.56, p)));
    const bodyAlpha = ss(0.82, 0.95, p);
    for (const a of BODY_ANCHORS) project(this.tmpV.set(...a).applyMatrix4(this.body.matrixWorld), bodyAlpha);
    cb(out, p);
  }
}
