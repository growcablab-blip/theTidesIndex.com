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
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import {
  BRAIN,
  boundsTransform,
  buildBrainLinks,
  buildNetwork,
  buildStory,
  HEART,
  mulberry32,
  type StoryTargets,
  type Work,
} from './body-model';
import { decodeFigure, FIGURE_URL } from './figure-format';
import type { TierBudget } from './hero-tier';
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
  landscape: { helix: new THREE.Vector3(1.75, 1.35, 3.3), membrane: new THREE.Vector3(2.75, 1.75, 1.5) },
  portrait: { helix: new THREE.Vector3(1.05, 3.55, 3.0), membrane: new THREE.Vector3(1.35, 3.1, 1.6) },
} as const;

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

  private readonly helixM = new THREE.Matrix4();
  private readonly memM = new THREE.Matrix4();
  private readonly heartW = new THREE.Vector3();
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpE = new THREE.Euler();
  private readonly spin = new THREE.Quaternion();
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
      depth: false,
      preserveDrawingBuffer: opts.poster === true,
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
      this.buildFigure(file);
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
      this.buildShell(file.density, file.gridSize, file.densityRange);
    } catch (error) {
      if (!this.disposed) {
        console.error('[hero] failed to start', error);
        this.opts.onContextLost();
      }
    }
  }

  private buildFigure(file: ReturnType<typeof decodeFigure>) {
    const b = this.budget;
    const take = [
      { from: 0, n: Math.min(b.surface, file.surface), kind: 0 },
      { from: file.surface, n: Math.min(b.interior, file.interior), kind: 1 },
      { from: file.surface + file.interior, n: Math.min(b.brain, file.brain), kind: 2 },
    ];
    const total = take.reduce((s, t) => s + t.n, 0);
    const pos = new Int16Array(total * 3);
    const nor = new Int8Array(total * 3);
    const kind = new Uint8Array(total);
    let o = 0;
    for (const t of take) {
      pos.set(file.positions.subarray(t.from * 3, (t.from + t.n) * 3), o * 3);
      if (t.kind === 0) nor.set(file.normals.subarray(0, t.n * 3), o * 3);
      kind.fill(t.kind, o, o + t.n);
      o += t.n;
    }
    const rand = mulberry32(211);
    const rnd = new Uint8Array(total * 4);
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.floor(rand() * 256);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3, true));
    geo.setAttribute('aNormal', new THREE.BufferAttribute(nor, 3, true));
    geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1, false));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4, true));

    const { centre, half } = boundsTransform();
    const mat = this.additive(FIGURE_VERT, POINT_FRAG, {
      uCentre: { value: new THREE.Vector3(...centre) },
      uHalf: { value: new THREE.Vector3(...half) },
      uTime: { value: 0 },
      uPx: { value: 1 },
      uMaxPx: { value: 20 },
      uIntro: { value: 0 },
      uActivate: { value: 0 },
      uWave: { value: 0 },
      uScanY: { value: 0 },
      uCentreDepth: { value: 10 },
      uHeart: { value: new THREE.Vector3(...HEART) },
    });
    this.figure = new THREE.Points(geo, mat);
    this.figure.frustumCulled = false;
    this.figure.renderOrder = 2;
    this.body.add(this.figure);
    this.updatePx();
  }

  private buildShell(density: Int8Array, size: number, range: number) {
    const { centre, half } = boundsTransform();
    const mat = new THREE.ShaderMaterial({
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uCentre: { value: new THREE.Vector3(...centre) },
        uHalf: { value: new THREE.Vector3(...half) },
        uIntro: { value: 0 },
        uActivate: { value: 0 },
        uWave: { value: 0 },
        uScanY: { value: 0 },
        uTime: { value: 0 },
        uHeart: { value: new THREE.Vector3(...HEART) },
      },
    });
    const mc = new MarchingCubes(size, mat, false, false, 60000);
    for (let i = 0; i < density.length; i++) mc.field[i] = (density[i]! / 127) * range;
    mc.isolation = 0;
    mc.update();
    mc.position.set(...centre);
    mc.scale.set(...half);
    mc.frustumCulled = false;
    mc.renderOrder = 1;
    this.shellMat = mat;
    this.body.add(mc);
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
    const poster = this.opts.poster === true;
    this.time = poster ? 14 : this.time + dt;
    this.intro = poster ? 1 : Math.min(1, this.intro + dt / 2.6);
    // Scroll is followed, not mirrored: the damping is the difference between a
    // film and a slideshow dragged by hand.
    this.p = poster ? 1 : this.p + (this.pTarget - this.p) * (1 - Math.exp(-dt * 5));
    const p = this.p;
    const t = this.time;
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3));
    const px = this.portrait || poster ? 0 : this.pointerSmooth.x;
    const py = this.portrait || poster ? 0 : this.pointerSmooth.y;

    // ── choreography
    // holds between the moves, so each state is seen before it changes
    const uAB = ss(0.14, 0.34, p);
    const uBC = ss(0.5, 0.74, p);
    const activate = ss(0.64, 0.84, p);
    const wave = 11.5 * ss(0.64, 0.98, p);
    const reveal = 1.05 * ss(0.66, 0.98, p);
    const scanY = Math.sin(t * 0.33) * 5.2;

    // ── the body: a slow, living turn
    this.body.rotation.y = Math.sin(t * 0.13) * 0.3 * (1 - activate * 0.4) + px * 0.22 + 0.12;
    this.body.position.y = Math.sin(t * 0.4) * 0.03;
    this.body.updateMatrixWorld();
    this.heartW.set(...HEART).applyMatrix4(this.body.matrixWorld);

    // ── camera
    const cam = this.portrait ? CAM.portrait : CAM.landscape;
    const drift = poster ? 0 : 1;
    this.camera.position.set(
      track(cam.x, p) + px * 0.35 + drift * Math.sin(t * 0.21) * 0.06,
      track(cam.y, p) + py * 0.2 + drift * Math.cos(t * 0.17) * 0.05,
      track(cam.z, p),
    );
    this.camera.lookAt(track(cam.lx, p), track(cam.ly, p), track(cam.lz, p));
    this.camera.updateMatrixWorld();
    const pm = this.camera.projectionMatrix;
    this.camera.updateProjectionMatrix();
    pm.elements[8] = track(cam.shiftX, p);
    pm.elements[9] = track(cam.shiftY, p);
    if (poster) {
      // The still sits under the copy for visitors without the sequence, so it
      // keeps the figure clear of the headline, as the opening frame does.
      pm.elements[8] = this.portrait ? 0 : -0.36;
      pm.elements[9] = this.portrait ? -0.12 : 0;
    }
    this.camera.projectionMatrixInverse.copy(pm).invert();

    // ── the peptide and the membrane
    this.tmpE.set(0.35 + py * 0.15, t * 0.25 + px * 0.3, 0.85);
    this.tmpQ.setFromEuler(this.tmpE);
    this.tmpQ.multiply(this.spin.setFromAxisAngle(HeroEngine.UP, t * 0.45));
    const place = this.portrait ? PLACES.portrait : PLACES.landscape;
    this.helixM.compose(place.helix, this.tmpQ, this.tmpV.set(1, 1, 1));
    this.tmpE.set(0.12 + Math.sin(t * 0.3) * 0.05, -0.25 + Math.sin(t * 0.23) * 0.08, 0.05);
    this.tmpQ.setFromEuler(this.tmpE);
    this.memM.compose(place.membrane, this.tmpQ, this.tmpV.set(1, 1, 1));

    // ── uniforms
    const centreDepth = this.camera.position.distanceTo(this.tmpV.set(0, 1, 0));
    if (this.figure) {
      const u = this.figure.material.uniforms;
      u.uTime!.value = t;
      u.uIntro!.value = this.intro;
      u.uActivate!.value = activate;
      u.uWave!.value = wave;
      u.uScanY!.value = scanY;
      u.uCentreDepth!.value = centreDepth;
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
