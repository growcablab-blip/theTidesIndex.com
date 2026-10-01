/**
 * GLSL for the hero. Kept in one place so the look can be tuned without reading
 * the engine.
 *
 * Every layer is additive light over a dark backdrop: nothing here is lit by a
 * lamp. Depth comes from three cues that are cheap on any GPU — fresnel (edges
 * glow, faces facing the lens stay clear), back-side attenuation (the far half
 * of the body is dimmer than the near half) and point size falling with
 * distance.
 */

/** Shared helpers. */
const COMMON = /* glsl */ `
  float ease(float x) { return x * x * (3.0 - 2.0 * x); }
  // Each particle leaves and arrives on its own clock; that stagger is what makes
  // a morph read as matter moving rather than a crossfade.
  float stag(float u, float r) { return ease(clamp((u - r * 0.38) / 0.62, 0.0, 1.0)); }
`;

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

export const BACKDROP_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

export const BACKDROP_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform vec2 uFocus;
  uniform float uAspect;
  uniform float uGlow;
  void main() {
    vec2 q = vUv - uFocus;
    q.x *= uAspect;
    float r = length(q);
    vec3 deep = vec3(0.010, 0.040, 0.066);
    vec3 pool = vec3(0.020, 0.105, 0.150);
    vec3 col = mix(pool, deep, smoothstep(0.0, 0.95, r));
    // a cool halo behind the figure and a faint indigo counter-light low and left
    col += vec3(0.02, 0.10, 0.13) * uGlow * exp(-r * r * 5.0);
    vec2 q2 = vUv - vec2(uFocus.x - 0.35, 0.18);
    q2.x *= uAspect;
    col += vec3(0.035, 0.03, 0.09) * exp(-dot(q2, q2) * 3.0);
    float vig = smoothstep(1.35, 0.3, length((vUv - 0.5) * vec2(uAspect, 1.0)));
    col *= mix(0.55, 1.0, vig);
    // settle into the page colour at the bottom edge
    col = mix(vec3(0.012, 0.047, 0.075), col, smoothstep(0.0, 0.22, vUv.y));
    // a breath of dither keeps the gradient from banding on 8-bit panels
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// The figure's particles: surface, interior haze, neural cluster
// ---------------------------------------------------------------------------

export const FIGURE_VERT = /* glsl */ `
  attribute vec3 aNormal;
  attribute float aKind;
  attribute vec4 aRand;

  uniform float uTime;
  uniform float uPx;
  uniform float uMaxPx;
  uniform float uIntro;
  uniform float uActivate;
  uniform float uWave;       // radius of the activation wave, body units
  uniform float uScanY;
  uniform float uCentreDepth;
  uniform vec3 uHeart;
  uniform float uFocus;      // distance to the plane in focus
  uniform float uAperture;   // how quickly things leave it

  varying vec3 vCol;
  varying float vA;

  void main() {
    vec3 p = position;
    vec3 n = aNormal;
    float surface = step(aKind, 0.5);
    float interior = step(0.5, aKind) * step(aKind, 1.5);
    float brain = step(1.5, aKind);

    p += n * surface * 0.014 * sin(uTime * 1.1 + p.y * 0.9);
    p += brain * 0.02 * vec3(sin(uTime * 0.7 + aRand.x * 6.28), cos(uTime * 0.6 + aRand.y * 6.28), sin(uTime * 0.8 + aRand.z * 6.28));

    vec4 wp = modelMatrix * vec4(p, 1.0);
    vec4 mv = viewMatrix * wp;
    vec3 wn = normalize(mat3(modelMatrix) * (n + vec3(0.0, 0.0, 1e-4)));
    vec3 v = normalize(cameraPosition - wp.xyz);
    float fres = pow(1.0 - abs(dot(wn, v)), 3.6);

    // arrival: the body resolves from the feet up
    float line = mix(-6.5, 6.5, uIntro);
    float shown = smoothstep(line + 0.5, line - 0.5, p.y);
    float edgeLight = exp(-pow((p.y - line) * 2.2, 2.0)) * step(uIntro, 0.999);

    // the activation wave, spreading from the heart
    float d = length(p - uHeart);
    float lit = smoothstep(uWave, uWave - 1.8, d) * uActivate;
    float front = exp(-pow((d - uWave) * 1.4, 2.0)) * step(0.01, uWave) * uActivate;

    float scan = exp(-pow((p.y - uScanY) * 3.2, 2.0));

    vec3 dormant = vec3(0.36, 0.64, 0.9);
    vec3 awake = mix(vec3(0.16, 0.86, 0.96), vec3(0.58, 0.52, 0.98), smoothstep(3.2, 4.6, p.y));
    vec3 col = mix(dormant, awake, lit);
    col = mix(col, vec3(0.9, 1.0, 1.0), front * 0.6);

    // nearly clear face-on; the form is drawn by its edges, as a hologram is
    // imaging, not glow: clear faces, a defined edge, almost no haze
    float a = surface * (0.012 + 0.55 * fres + 0.04 * lit + 0.38 * front + 0.18 * scan * (0.3 + fres))
            + interior * (0.006 + 0.012 * lit + 0.1 * front)
            + brain * (0.12 + 0.34 * lit + 0.22 * sin(uTime * 2.0 + aRand.w * 30.0) * lit);
    a += edgeLight * 0.8;

    // the far half of the body sits back
    float back = clamp((-mv.z - uCentreDepth) / 1.2, 0.0, 1.0);
    a *= 1.0 - back * 0.55;
    a *= shown;

    float size = mix(0.019, 0.03, interior) * (0.75 + aRand.w * 0.5);
    size *= 1.0 + brain * 0.1 + front * 0.6;
    float dist = max(0.0001, -mv.z);
    // depth of field: out of focus, a point grows and fades — it defocuses
    float coc = clamp(abs(dist - uFocus) * uAperture, 0.0, 3.0);
    size *= 1.0 + coc * 1.6;
    a /= 1.0 + coc * 2.2;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(size * uPx / dist, 1.0, uMaxPx);
    vCol = col;
    vA = a;
  }
`;

export const POINT_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vCol;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    // a crisp dot with a short falloff — precise, not a soft glow
    float m = smoothstep(0.5, 0.28, d);
    gl_FragColor = vec4(vCol, m * vA);
  }
`;

// ---------------------------------------------------------------------------
// The shell: the body as glass, read through its fresnel rim and contour lines
// ---------------------------------------------------------------------------

export const SHELL_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vBody;
  void main() {
    vBody = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const SHELL_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vBody;
  uniform float uIntro;
  uniform float uActivate;
  uniform float uWave;
  uniform float uScanY;
  uniform float uTime;
  uniform vec3 uHeart;
  void main() {
    vec3 v = normalize(cameraPosition - vW);
    float f = 1.0 - abs(dot(normalize(vN), v));
    float rim = pow(f, 4.0);
    // a clean contour line at the silhouette, as an imaging view draws it
    float edge = smoothstep(0.86, 0.97, f) * (1.0 - smoothstep(0.985, 1.0, f));

    // contour slices, as a scanner would take them
    float k = vBody.y * 6.0;
    float w = fwidth(k) * 1.3;
    float slice = 1.0 - smoothstep(0.0, w, abs(fract(k) - 0.5) - (0.5 - w));
    float scan = exp(-pow((vBody.y - uScanY) * 2.6, 2.0));

    float d = length(vBody - uHeart);
    float lit = smoothstep(uWave, uWave - 2.0, d) * uActivate;
    float front = exp(-pow((d - uWave) * 1.3, 2.0)) * step(0.01, uWave) * uActivate;

    float line = mix(-6.5, 6.5, uIntro);
    float shown = smoothstep(line + 0.4, line - 0.4, vBody.y);

    vec3 col = mix(vec3(0.35, 0.7, 0.85), vec3(0.2, 0.85, 0.95), lit);
    col = mix(col, vec3(0.9, 1.0, 1.0), front * 0.5);
    // soft directional shading gives the glass a body, not just an outline
    vec3 keyDir = normalize(vec3(-0.45, 0.6, 0.65));
    float shade = 0.5 + 0.5 * dot(normalize(vN), keyDir);
    float fill = shade * shade * (1.0 - rim) * 0.05;
    float a = fill + rim * (0.26 + 0.14 * lit) + edge * (0.34 + 0.2 * lit) + slice * (0.018 + 0.05 * rim) + scan * (0.025 + 0.12 * rim) + front * 0.08;
    gl_FragColor = vec4(col, a * shown);
  }
`;

// ---------------------------------------------------------------------------
// Networks: neural and vascular paths
// ---------------------------------------------------------------------------

export const NETWORK_VERT = /* glsl */ `
  attribute float aDist;
  attribute float aKind;
  attribute float aSeed;
  uniform float uTime;
  uniform float uReveal;
  uniform float uIntro;
  varying vec3 vCol;
  varying float vA;
  void main() {
    float revealed = smoothstep(uReveal, uReveal - 0.06, aDist);
    float pulse = pow(max(0.0, 1.0 - abs(fract(aDist * 3.0 - uTime * (0.22 + aSeed * 0.1) + aSeed) - 0.5) * 7.0), 2.0);
    vec3 neural = vec3(0.66, 0.6, 1.0);
    vec3 vascular = vec3(0.2, 0.85, 0.96);
    vCol = mix(neural, vascular, aKind);
    vCol = mix(vCol, vec3(0.95, 1.0, 1.0), pulse * revealed * 0.6);
    // dormant: the paths are faintly there before any signal arrives
    vA = (0.06 + revealed * (0.55 + pulse * 0.9)) * uIntro;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const LINE_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vCol;
  varying float vA;
  void main() { gl_FragColor = vec4(vCol, vA); }
`;

// ---------------------------------------------------------------------------
// The story: peptide → receptors → the body
// ---------------------------------------------------------------------------

export const STORY_VERT = /* glsl */ `
  attribute vec3 aHelix;
  attribute vec3 aMem;
  attribute vec3 aNet;
  attribute vec3 aColH;
  attribute vec3 aColM;
  attribute vec3 aColN;
  attribute vec4 aRand;

  uniform mat4 uHelixM;
  uniform mat4 uMemM;
  uniform mat4 uBodyM;
  uniform vec3 uHeartW;
  uniform float uAB;
  uniform float uBC;
  uniform float uTime;
  uniform float uIntro;
  uniform float uPx;
  uniform float uMaxPx;
  uniform float uReveal;
  uniform float uFocus;      // distance to the plane in focus
  uniform float uAperture;   // how quickly things leave it
  uniform float uSkin;       // how present the particle skin is around the solid peptide

  varying vec3 vCol;
  varying float vA;

  ${COMMON}

  void main() {
    float a = stag(uAB, aRand.x);
    float b = stag(uBC, aRand.y);

    vec3 ph = (uHelixM * vec4(aHelix, 1.0)).xyz;
    ph += 0.012 * sin(uTime * 1.4 + aRand.z * 6.28);
    // the peptide condenses out of a wider cloud on first paint
    vec3 cloud = ph * 1.2 + (aRand.xyz - 0.5) * vec3(7.0, 5.0, 5.0) + vec3(0.0, 0.0, -3.0);
    ph = mix(cloud, ph, ease(clamp(uIntro * 1.35 - aRand.w * 0.35, 0.0, 1.0)));

    vec3 pm = (uMemM * vec4(aMem, 1.0)).xyz;
    pm += 0.015 * vec3(0.0, 0.0, sin(uTime * 0.9 + pm.x * 2.0 + pm.y));
    vec3 pn = (uBodyM * vec4(aNet, 1.0)).xyz;

    vec3 pAB = mix(ph, pm, a);
    // into the body through the heart: a quadratic path from wherever the
    // particle is, via the heart, to its place on the networks
    vec3 ctrl = uHeartW + (aRand.xyz - 0.5) * vec3(0.9, 0.9, 0.6);
    vec3 p = mix(mix(pAB, ctrl, b), mix(ctrl, pn, b), b);

    // matter in transit swirls; at rest it holds its shape
    float env = sin(a * 3.14159) * (1.0 - b) + sin(b * 3.14159) * 0.55;
    p += env * 0.38 * vec3(
      sin(p.y * 2.1 + uTime * 1.7 + aRand.x * 9.0),
      sin(p.z * 1.9 + uTime * 1.3 + aRand.y * 9.0),
      sin(p.x * 2.3 + uTime * 1.5 + aRand.z * 9.0));

    vec3 col = mix(aColH, aColM, a);
    col = mix(col, aColN, b);
    col = mix(col, vec3(0.9, 1.0, 1.0), sin(b * 3.14159) * 0.35);

    float size = mix(0.036, 0.034, a);
    size = mix(size, 0.02, b);
    size *= 0.7 + aRand.w * 0.6;
    float alpha = mix(0.34 * uSkin, 0.42, a);
    alpha = mix(alpha, 0.38 + 0.2 * sin(uTime * 2.2 + aRand.w * 40.0), b);
    alpha *= smoothstep(0.0, 0.25, uIntro);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = max(0.0001, -mv.z);
    // particles brushing past the lens fade instead of becoming discs
    alpha *= smoothstep(0.3, 1.6, dist);
    float coc = clamp(abs(dist - uFocus) * uAperture, 0.0, 3.0);
    size *= 1.0 + coc * 1.6;
    alpha /= 1.0 + coc * 2.2;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(size * uPx / dist, 1.0, uMaxPx);
    vCol = col;
    vA = alpha;
  }
`;

// ---------------------------------------------------------------------------
// Glows (heart, head) and out-of-focus motes near the lens
// ---------------------------------------------------------------------------

export const GLOW_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPx;
  uniform float uMaxPx;
  uniform float uTime;
  uniform float uStrength;
  varying vec3 vCol;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float beat = 0.82 + 0.18 * pow(0.5 + 0.5 * sin(uTime * 2.4), 6.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * beat * uPx / max(0.1, -mv.z), 1.0, uMaxPx * 6.0);
    vCol = aColor;
    vA = uStrength;
  }
`;

export const GLOW_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vCol;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = exp(-d * d * 40.0);
    float halo = exp(-d * d * 7.0);
    gl_FragColor = vec4(vCol, (core * 0.9 + halo * 0.12) * vA * step(d, 1.0));
  }
`;

export const MOTE_VERT = /* glsl */ `
  attribute vec2 aR;
  uniform float uTime;
  uniform float uPx;
  uniform vec2 uDrift;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.07 + aR.x * 6.28) * 0.9 + uDrift.x * (8.0 + p.z);
    p.y += cos(uTime * 0.05 + aR.y * 6.28) * 0.6 + uDrift.y * (8.0 + p.z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float d = max(0.5, -mv.z);
    // the nearer, the bigger and the fainter: that is what defocus looks like
    gl_PointSize = clamp((0.16 + aR.x * 0.3) * uPx / d, 6.0, 110.0);
    vA = (0.025 + 0.035 * aR.y) * smoothstep(0.8, 3.0, d);
    gl_Position = projectionMatrix * mv;
  }
`;

export const MOTE_FRAG = /* glsl */ `
  precision mediump float;
  varying float vA;
  uniform float uAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float m = smoothstep(0.5, 0.3, d);
    gl_FragColor = vec4(0.5, 0.9, 1.0, m * vA * uAlpha);
  }
`;
