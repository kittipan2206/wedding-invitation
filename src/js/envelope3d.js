// Real-3D envelope (three.js) — loaded lazily by main.js only when the
// envelope will actually play. Same story beats and timing as the CSS
// envelope in envelope.js (which stays as the fallback):
//   idle float + tilt (light sweeps the rose-gold foil + glossy wax)
//   → seal cracks in two → flap swings back → card rises
//   → card flies out and lands EXACTLY on the DOM letter's rect as blank
//     paper (unlit shader, same colours/border/shadow) → DOM takes over
//   → later: dissolve() melts overlay + paper away from the tap point with
//     a pastel watercolour edge, revealing the page underneath.
//
// Art direction: one cotton-paper stock for the whole envelope (a real
// flap is the same paper as the pocket — colour comes from light, not
// gradients), die-cut rounded corners, a seamed pocket, real cast shadows
// between the layers, a stamped wax puddle and pressed rose-gold foil.
//
// World units = CSS pixels on the z=0 plane (camera distance derived from
// the fov), so DOM rects map straight into the scene.
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  PlaneGeometry,
  ShapeGeometry,
  ExtrudeGeometry,
  CircleGeometry,
  Shape,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MeshBasicMaterial,
  ShaderMaterial,
  CanvasTexture,
  PMREMGenerator,
  DirectionalLight,
  PointLight,
  HemisphereLight,
  SRGBColorSpace,
  NoColorSpace,
  NeutralToneMapping,
  BackSide,
  FrontSide,
  Vector2,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";
import { LETTER_MARGIN } from "./paper.js";
import { INK_PEN } from "./letter.js";

const W = 280;
const H = 200;
const FOLD = 0.58; // flap tip / pocket V depth, as a fraction of H
const CORNER = 5; // die-cut corner radius
const FOV = 30;
const MARGIN = LETTER_MARGIN; // px of shadow room around the card quad

// Layer heights — spaced so the key light casts a visible hairline shadow
const Z_POCKET = 2;
const Z_FLAP = 9;
const Z_SEAL = 10.5;

const PAPER = "#f7f2ec"; // warm ivory cotton stock
const INK = "#2e2a28";
const MUTED = "#8a7f7a";
const WAX = 0x9c4862; // dusty raspberry
const SERIF = `"Cormorant Garamond", "Trirong", Georgia, serif`;
const SANS = `"DM Sans", "IBM Plex Sans Thai Looped", sans-serif`;
const SCRIPT = `"Charm", "Trirong", serif`; // handwritten address (letter hand)


// Link-preview capture (scripts/og-capture.mjs): a still, bigger, sharper
// envelope — { zoom, y, tilt: [x, y], reserveTo } — never set for guests
const OG = typeof window !== "undefined" ? window.__OG_CAPTURE : null;
const PARTICLE_COLORS = [0xf2d3db, 0xd9a3b3, 0x9c4862, 0xd9cfe6];

// ── Canvas helpers ────────────────────────────────────────────────────────
function makeCanvas(w, h, scale = 2) {
  if (OG) scale *= 3; // the capture zooms in ~2.7×
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d");
  ctx.scale(scale, scale);
  return { c, ctx };
}

// Cheap deterministic PRNG so every guest gets the same seal and grain
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Cotton-paper fibres for a BUMP map: short soft strands, no dirt speckles
function fibres(ctx, w, h, density = 1, seed = 1) {
  const r = rng(seed);
  ctx.lineCap = "round";
  for (let i = 0; i < w * h * 0.004 * density; i++) {
    const x = r() * w;
    const y = r() * h;
    const a = r() * Math.PI * 2;
    const l = 3 + r() * 9;
    const up = r() > 0.5;
    ctx.strokeStyle = up
      ? `rgba(255,255,255,${0.05 + r() * 0.08})`
      : `rgba(0,0,0,${0.04 + r() * 0.07})`;
    ctx.lineWidth = 0.35 + r() * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a + 0.6) * l * 0.5,
      y + Math.sin(a + 0.6) * l * 0.5,
      x + Math.cos(a) * l,
      y + Math.sin(a) * l,
    );
    ctx.stroke();
  }
}

// Very low-contrast cloudy mottling for colour maps (real stock is uneven)
function mottle(ctx, w, h, seed = 3) {
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 30 + r() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() > 0.5;
    g.addColorStop(0, dark ? "rgba(120,90,100,0.035)" : "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

function tex(canvas, color = true) {
  const t = new CanvasTexture(canvas);
  t.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  t.anisotropy = 4;
  return t;
}

function heartPath(ctx, cx, cy, s) {
  // same heart as the SVG seal icon, 24-unit box centred on (cx, cy)
  ctx.save();
  ctx.translate(cx - 12 * s, cy - 12 * s);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(12, 20.5);
  ctx.lineTo(10.7, 19.3);
  ctx.bezierCurveTo(6, 15.1, 3, 12.3, 3, 8.9);
  ctx.bezierCurveTo(3, 6.1, 5.2, 4, 7.9, 4);
  ctx.bezierCurveTo(9.5, 4, 11, 4.7, 12, 5.9);
  ctx.bezierCurveTo(13, 4.7, 14.5, 4, 16.1, 4);
  ctx.bezierCurveTo(18.8, 4, 21, 6.1, 21, 8.9);
  ctx.bezierCurveTo(21, 12.3, 18, 15.1, 13.3, 19.4);
  ctx.closePath();
  ctx.restore();
}

// ShapeGeometry UVs are raw shape coords — normalise to the W×H box
function boxUVs(geo, w, h, ox = 0, oy = 0) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - ox) / w + 0.5, (pos.getY(i) - oy) / h + 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

// Soft shadow texture of a shape: only the blurred shadow is painted (the
// shape itself is drawn far off-canvas). shadowBlur, not ctx.filter —
// canvas filters need iOS 18+.
function softShadow(w, h, pad, blur, color, draw) {
  const { c, ctx } = makeCanvas(w + pad * 2, h + pad * 2, 2);
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * 2;
  ctx.shadowOffsetX = 10000 * 2;
  ctx.translate(pad - 10000, pad);
  ctx.fillStyle = "#000";
  draw(ctx);
  return c;
}

// DOM-space point (top-left origin, y down) → envelope-local (centre, y up)
const L = (x, y) => [x - W / 2, H / 2 - y];

// Polygon with every corner rounded by r (pts in local coords)
function roundedShape(pts, r) {
  const s = new Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[(i - 1 + n) % n];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[(i + 1) % n];
    const rr = Array.isArray(r) ? r[i] : r;
    const d1 = Math.hypot(px - cx, py - cy);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const k1 = Math.min(rr, d1 / 2) / d1;
    const k2 = Math.min(rr, d2 / 2) / d2;
    const a = [cx + (px - cx) * k1, cy + (py - cy) * k1];
    const b = [cx + (nx - cx) * k2, cy + (ny - cy) * k2];
    if (i === 0) s.moveTo(...a);
    else s.lineTo(...a);
    s.quadraticCurveTo(cx, cy, ...b);
  }
  s.closePath();
  return s;
}

// ── Paper shader: rounded rect + hairline border + two-layer shadow, unlit
// so its final frame matches the DOM letter it hands over to ──
const PAPER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DISSOLVE_GLSL = /* glsl */ `
  uniform float uRadius;   // dissolve front radius (px), -1 = off
  uniform vec2 uOrigin;    // CSS px, top-left origin
  uniform vec2 uView;      // viewport CSS px
  uniform float uDpr;
  vec2 cssPos() {
    vec2 fc = gl_FragCoord.xy / uDpr;
    return vec2(fc.x, uView.y - fc.y);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.07; a *= 0.5; }
    return v;
  }
  // returns alpha multiplier; tints col with pigment near the wet edge
  float dissolve(inout vec3 col) {
    if (uRadius < 0.0) return 1.0;
    vec2 pos = cssPos();
    float n = fbm(pos * 0.011);
    float edge = length(pos - uOrigin) - uRadius + (n - 0.5) * 170.0;
    if (edge < 0.0) discard;
    // pastel pigment bleeding along the front (pink → lilac → blue)
    float hue = fbm(pos * 0.004 + 7.0);
    vec3 pink = vec3(0.949, 0.827, 0.859);
    vec3 lilac = vec3(0.851, 0.812, 0.902);
    vec3 blue = vec3(0.780, 0.863, 0.945);
    vec3 pig = hue < 0.5 ? mix(pink, lilac, hue * 2.0) : mix(lilac, blue, hue * 2.0 - 1.0);
    float wet = 1.0 - smoothstep(0.0, 60.0, edge);
    float rim = 1.0 - smoothstep(0.0, 6.0, edge); // darker "coffee ring" line
    // granulation: pigment settles unevenly in the paper tooth
    float gran = 0.85 + 0.3 * vnoise(pos * 0.45);
    col = mix(col, pig * (1.0 - 0.14 * rim), clamp((wet * 0.7 + rim * 0.35) * gran, 0.0, 1.0));
    return smoothstep(0.0, 3.0, edge);
  }
`;

// Must match #envelope-overlay's CSS background (radial, farthest-corner)
const BG_GLSL = /* glsl */ `
  vec3 overlayBg(vec2 pos) {
    vec2 c = uView * 0.5;
    float t = clamp(length((pos - c) / (c * 1.41421356)), 0.0, 1.0);
    return mix(vec3(0.925, 0.906, 0.882), vec3(0.851, 0.820, 0.788), t);
  }
`;

const PAPER_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform vec2 uSize;
  uniform float uRadiusPx;
  uniform float uMix;       // 0 = monogram card face, 1 = blank open letter
  uniform float uShadow;
  uniform float uOpacity;
  uniform float uShade;     // darkening while inside the pocket
  uniform sampler2D uFace;
  uniform sampler2D uLetterFace;   // paper.js letterPaper() — same canvases
  uniform sampler2D uLetterShadow; // the DOM letter draws
  uniform float uHasLetter;
  ${DISSOLVE_GLSL}
  float sdRR(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  void main() {
    vec2 full = uSize + 2.0 * ${MARGIN.toFixed(1)};
    vec2 p = (vUv - 0.5) * full;
    float d = sdRR(p, uSize * 0.5, uRadiusPx);
    vec3 shCol = vec3(0.235, 0.157, 0.196); // rgb(60,40,50)
    // box-shadow: 0 1px 2px rgba(60,40,50,.06), 0 16px 48px rgba(60,40,50,.10)
    float s1 = 0.06 * (1.0 - smoothstep(-1.0, 1.5, sdRR(p - vec2(0.0, -1.0), uSize * 0.5, uRadiusPx)));
    float s2 = 0.10 * (1.0 - smoothstep(-24.0, 26.0, sdRR(p - vec2(0.0, -16.0), uSize * 0.5, uRadiusPx)));
    float sh = (s1 + s2 - s1 * s2) * uShadow;
    float inside = 1.0 - smoothstep(-0.5, 0.5, d);
    vec3 closedCol = texture2D(uFace, clamp(p / uSize + 0.5, 0.0, 1.0)).rgb;
    vec3 openCol = vec3(1.0, 0.992, 0.984); // #fffdfb
    float fromTop = uSize.y * 0.5 - p.y;
    if (fromTop < 5.0) {
      float gx = clamp(p.x / uSize.x + 0.5, 0.0, 1.0);
      vec3 lav = vec3(0.788, 0.722, 0.910);
      vec3 wash = gx < 0.5
        ? mix(vec3(0.976, 0.784, 0.831), lav, gx * 2.0)
        : mix(lav, vec3(0.722, 0.847, 0.973), gx * 2.0 - 1.0);
      openCol = mix(openCol, wash, 0.7);
    }
    // closed card: rounded rect + hairline + SDF shadow (premultiplied)
    vec3 col = closedCol * (1.0 - uShade);
    float border = 1.0 - smoothstep(0.0, 1.0, abs(d + 0.5));
    col = mix(col, vec3(0.314, 0.235, 0.275), border * 0.10);
    vec4 closedP = vec4(col * inside + shCol * sh * (1.0 - inside), inside + sh * (1.0 - inside));
    // open letter: the card sheet + its baked shadow
    vec4 openP = vec4(openCol * inside + shCol * sh * (1.0 - inside), inside + sh * (1.0 - inside));
    if (uHasLetter > 0.5) {
      vec4 lf = texture2D(uLetterFace, clamp(p / uSize + 0.5, 0.0, 1.0));
      vec4 ls = texture2D(uLetterShadow, vUv);
      openP = vec4(lf.rgb * lf.a + ls.rgb * ls.a * (1.0 - lf.a), lf.a + ls.a * (1.0 - lf.a));
    }
    vec4 P = mix(closedP, openP, uMix);
    float a = P.a;
    vec3 c = P.rgb / max(a, 1e-4);
    a *= dissolve(c) * uOpacity;
    if (a < 0.003) discard; // empty shadow margin must not write depth
    gl_FragColor = vec4(c, a);
  }
`;

// Full-screen overlay background for the dissolve
const BG_FRAG = /* glsl */ `
  ${DISSOLVE_GLSL}
  ${BG_GLSL}
  void main() {
    vec3 c = overlayBg(cssPos());
    float a = dissolve(c);
    gl_FragColor = vec4(c, a);
  }
`;

// ── Scene ─────────────────────────────────────────────────────────────────
// opts.closing = { sheetEl, sheetCanvas, onStamped } → the finale's scrubbed
// closing scene (see closingControls); opts.anchor = the element the
// envelope rests on (defaults to the overlay's .envelope-body)
export async function createEnvelopeScene(overlay, opts = {}) {
  const body = opts.anchor || overlay.querySelector(".envelope-body");
  if (!body) return null;
  const coupleText = overlay.querySelector(".env-couple")?.textContent || "";
  const toEl = overlay.querySelector(".env-to");
  const toText =
    toEl && toEl.style.display !== "none" ? toEl.textContent.trim() : "";
  const cardNames =
    overlay.querySelector(".env-letter-names")?.textContent || coupleText;
  // Thai glyphs come from Trirong / Plex Thai — load them before painting
  // (after the async web-font stylesheet has declared them)
  await window.__fontsCss;
  await Promise.all([
    document.fonts.load(`italic 500 19px ${SERIF}`, coupleText),
    document.fonts.load(`400 16px ${SCRIPT}`, toText || "ถึง"),
    document.fonts.ready,
  ]).catch(() => {});

  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  // Neutral keeps pastel paper colours true instead of clipping to white
  // (the unlit card shader skips tone mapping, so it stays DOM-exact)
  renderer.toneMapping = NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.className = "env3d-canvas";
  canvas.setAttribute("aria-hidden", "true");
  // below the DOM letter (z 9) and skip button (z 10)
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:8;";

  const scene = new Scene();
  // near plane far from the eye: depth precision for layers ~1px apart
  const camera = new PerspectiveCamera(FOV, 1, 300, 6000);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  // warm sky / cool floor bounce — soft daylight on a table
  scene.add(new HemisphereLight(0xfff8f0, 0xd9d2dc, 0.4));

  const env = new Group();
  scene.add(env);

  // Key light rides with the envelope so its shading stays put while it floats.
  // No shadow map: layer shadows are baked (crisper, and cheaper on phones)
  const key = new DirectionalLight(0xfff6ee, 1.35);
  key.position.set(-150, 230, 420);
  env.add(key);
  env.add(key.target);
  // follows the tilt — this is what sweeps across the foil and wax
  const glint = new PointLight(0xfff1ea, OG ? OG.glint ?? 1.8 : 0.8, 0, 0);
  scene.add(glint);

  const disposables = [];
  const track = (x) => (disposables.push(x), x);

  // ── back panel (the envelope's inside, seen past the open flap) ──
  {
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = "#ebe4dd"; // same stock, in the envelope's own shade
    ctx.fillRect(0, 0, W, H);
    mottle(ctx, W, H, 11);
    const shape = roundedShape([L(0, 0), L(W, 0), L(W, H), L(0, H)], CORNER);
    const m = track(
      new MeshStandardMaterial({ map: track(tex(c)), roughness: 0.95 }),
    );
    const back = new Mesh(track(boxUVs(new ShapeGeometry(shape, 6), W, H)), m);
    env.add(back);
  }

  // ── card (monogram face → blank letter) ──
  const CARD_W = W - 32;
  const CARD_H = 172;
  const cardY = H / 2 - 14 - CARD_H / 2;
  let card;
  let cardU;
  {
    const { c, ctx } = makeCanvas(CARD_W, CARD_H, 3);
    ctx.fillStyle = "#fffdfb";
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.textAlign = "center";
    ctx.fillStyle = INK;
    ctx.font = `italic 400 21px ${SERIF}`;
    ctx.fillText(cardNames, CARD_W / 2, CARD_H / 2 - 4);
    ctx.fillStyle = "rgba(156,72,98,0.4)";
    ctx.fillRect(CARD_W / 2 - 18, CARD_H / 2 + 6, 36, 0.75);
    ctx.fillStyle = MUTED;
    ctx.font = `400 9.5px ${SANS}`;
    ctx.letterSpacing = "2.4px";
    ctx.fillText("WEDDING INVITATION", CARD_W / 2, CARD_H / 2 + 26);
    const face = track(tex(c, false)); // sampled raw → exact sRGB like DOM
    cardU = {
      uSize: { value: new Vector2(CARD_W, CARD_H) },
      uRadiusPx: { value: 4 },
      uMix: { value: 0 },
      uShadow: { value: 0 },
      uOpacity: { value: 1 },
      uShade: { value: 0.035 },
      uFace: { value: face },
      uLetterFace: { value: null },
      uLetterShadow: { value: null },
      uHasLetter: { value: 0 },
      uRadius: { value: -1 },
      uOrigin: { value: new Vector2() },
      uView: { value: new Vector2() },
      uDpr: { value: dpr },
    };
    const m = track(
      new ShaderMaterial({
        uniforms: cardU,
        vertexShader: PAPER_VERT,
        fragmentShader: PAPER_FRAG,
        transparent: true,
      }),
    );
    card = new Mesh(track(new PlaneGeometry(1, 1)), m);
    card.scale.set(CARD_W + 2 * MARGIN, CARD_H + 2 * MARGIN, 1);
    card.position.set(0, cardY, 1);
    env.add(card);
  }

  // ── front pocket: seamed (bottom flap over side flaps), foil names ──
  const bottomFlapTop = H * 0.47; // where the bottom flap's curved edge peaks
  {
    const { c, ctx } = makeCanvas(W, H, 3);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    mottle(ctx, W, H, 5);
    // bottom flap edge: soft shadow under its lip onto the side flaps
    const lip = new Path2D();
    lip.moveTo(-2, H + 2);
    lip.bezierCurveTo(W * 0.18, H * 0.66, W * 0.36, bottomFlapTop, W / 2, bottomFlapTop);
    lip.bezierCurveTo(W * 0.64, bottomFlapTop, W * 0.82, H * 0.66, W + 2, H + 2);
    // (shadowBlur, not ctx.filter — canvas filters need iOS 18+)
    ctx.save();
    ctx.strokeStyle = "rgba(90,60,70,0.10)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(90,60,70,0.10)";
    ctx.shadowBlur = 3;
    ctx.translate(0, -1.2);
    ctx.stroke(lip);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; // cut edge catching light
    ctx.lineWidth = 0.6;
    ctx.stroke(lip);

    // bump: pillow (a card inside) + fibres + seam step + pressed foil
    const bump = makeCanvas(W, H, 2);
    const b = bump.ctx;
    b.fillStyle = "#7a7a7a";
    b.fillRect(0, 0, W, H);
    const pg = b.createRadialGradient(W / 2, H * 0.62, 10, W / 2, H * 0.62, W * 0.62);
    pg.addColorStop(0, "#9a9a9a");
    pg.addColorStop(1, "#727272");
    b.fillStyle = pg;
    b.fillRect(0, 0, W, H);
    b.save();
    b.clip(lip); // the bottom flap sits one paper-thickness higher
    b.fillStyle = "rgba(255,255,255,0.10)";
    b.fillRect(0, 0, W, H);
    b.restore();
    fibres(b, W, H, 1.2, 7);

    // PBR map: G = roughness, B = metalness (three's channel convention)
    const pbr = makeCanvas(W, H, 3);
    pbr.ctx.fillStyle = "rgb(0,235,0)";
    pbr.ctx.fillRect(0, 0, W, H);

    // with a recipient: handwritten "ถึง คุณ…" under the seal, foil names
    // below it. The capture reserves the line (blank) for api/og-image.
    const addressed = !!toText || !!OG?.reserveTo;
    const T = OG
      ? { to: 21, toY: 161, names: addressed ? 23 : 27, namesY: addressed ? 191 : 180 }
      : { to: 16, toY: 158, names: addressed ? 17 : 19, namesY: addressed ? 180 : 170 };
    const textY = T.namesY;
    ctx.textAlign = pbr.ctx.textAlign = b.textAlign = "center";
    if (toText) {
      // pen ink: slightly transparent so the paper tooth shows
      ctx.fillStyle = INK_PEN;
      ctx.font = `400 ${T.to}px ${SCRIPT}`;
      ctx.fillText(toText, W / 2, T.toY, W - 40);
      b.fillStyle = "rgba(0,0,0,0.2)";
      b.font = ctx.font;
      b.fillText(toText, W / 2, T.toY, W - 40);
    }
    const fs = T.names;
    const font = `italic 500 ${fs}px ${SERIF}`;
    ctx.font = pbr.ctx.font = b.font = font;
    // foil: warm rose-gold; env reflections do the rest
    const fg = ctx.createLinearGradient(0, textY - fs, 0, textY + 2);
    fg.addColorStop(0, "#e8c3b6");
    fg.addColorStop(0.5, "#c98f80");
    fg.addColorStop(1, "#a86f63");
    ctx.fillStyle = fg;
    ctx.fillText(coupleText, W / 2, textY, W - 40);
    pbr.ctx.fillStyle = "rgb(0,70,255)";
    pbr.ctx.fillText(coupleText, W / 2, textY, W - 40);
    b.fillStyle = "rgba(0,0,0,0.5)"; // foil is pressed into the paper
    b.fillText(coupleText, W / 2, textY, W - 40);

    const shape = roundedShape(
      [L(0, 0), L(W / 2, H * FOLD), L(W, 0), L(W, H), L(0, H)],
      [CORNER, 10, CORNER, CORNER, CORNER],
    );
    const pbrTex = track(tex(pbr.c, false));
    const m = track(
      new MeshPhysicalMaterial({
        map: track(tex(c)),
        bumpMap: track(tex(bump.c, false)),
        bumpScale: 1.4,
        roughnessMap: pbrTex,
        metalnessMap: pbrTex,
        roughness: 1,
        metalness: 1,
        sheen: 0.25,
        sheenRoughness: 0.8,
        sheenColor: 0xffffff,
      }),
    );
    const pocket = new Mesh(track(boxUVs(new ShapeGeometry(shape, 10), W, H)), m);
    pocket.position.z = Z_POCKET;
    env.add(pocket);
  }

  // ── flap: same stock + patterned liner, hinged on the top edge ──
  const flap = new Group();
  flap.position.set(0, H / 2, Z_FLAP);
  let linerMat;
  {
    const fh = H * FOLD;
    const tri = roundedShape(
      [
        [-W / 2, 0],
        [W / 2, 0],
        [0, -fh],
      ],
      [CORNER, CORNER, 14],
    );
    const geo = track(boxUVs(new ShapeGeometry(tri, 10), W, fh, 0, -fh * 0.5));

    const front = makeCanvas(W, fh, 3);
    front.ctx.fillStyle = PAPER;
    front.ctx.fillRect(0, 0, W, fh);
    mottle(front.ctx, W, fh, 9);
    // cut edge catching the light along both diagonals
    front.ctx.strokeStyle = "rgba(255,255,255,0.6)";
    front.ctx.lineWidth = 0.7;
    front.ctx.beginPath();
    front.ctx.moveTo(1, 0.5);
    front.ctx.lineTo(W / 2, fh - 1);
    front.ctx.lineTo(W - 1, 0.5);
    front.ctx.stroke();
    const fb = makeCanvas(W, fh, 2);
    fb.ctx.fillStyle = "#808080";
    fb.ctx.fillRect(0, 0, W, fh);
    // gentle curl: the flap bows slightly away from the fold
    const cg = fb.ctx.createLinearGradient(0, 0, 0, fh);
    cg.addColorStop(0, "#747474");
    cg.addColorStop(1, "#8e8e8e");
    fb.ctx.fillStyle = cg;
    fb.ctx.fillRect(0, 0, W, fh);
    fibres(fb.ctx, W, fh, 1.2, 13);
    const fm = track(
      new MeshPhysicalMaterial({
        map: track(tex(front.c)),
        bumpMap: track(tex(fb.c, false)),
        bumpScale: 1.4,
        roughness: 0.9,
        side: FrontSide,
        sheen: 0.25,
        sheenRoughness: 0.8,
        sheenColor: 0xffffff,
      }),
    );
    const flapFront = new Mesh(geo, fm);
    flap.add(flapFront);

    // liner: lilac tissue printed with fine ivory florets
    const liner = makeCanvas(W, fh, 3);
    const lc = liner.ctx;
    lc.fillStyle = "#ddd3e6";
    lc.fillRect(0, 0, W, fh);
    lc.strokeStyle = "rgba(255,253,250,0.75)";
    lc.fillStyle = "rgba(255,253,250,0.75)";
    lc.lineWidth = 0.5;
    const step = 18;
    for (let row = 0, y = 6; y < fh + step; y += step * 0.866, row++) {
      for (let x = row % 2 ? step / 2 : 0; x < W + step; x += step) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + row;
          lc.beginPath();
          lc.ellipse(
            x + Math.cos(a) * 2.6,
            y + Math.sin(a) * 2.6,
            2.2,
            1.1,
            a,
            0,
            Math.PI * 2,
          );
          lc.stroke();
        }
        lc.beginPath();
        lc.arc(x, y, 0.7, 0, Math.PI * 2);
        lc.fill();
      }
    }
    linerMat = track(
      new MeshStandardMaterial({
        map: track(tex(liner.c)),
        roughness: 0.85,
        side: BackSide,
      }),
    );
    linerMat.color.setScalar(0.86);
    const flapLiner = new Mesh(geo, linerMat);
    flap.add(flapLiner);
  }
  env.add(flap);

  // Baked shadow the closed flap casts on the pocket (fades as it opens)
  let flapShadowMat;
  {
    const fh = H * FOLD;
    const pad = 16;
    const c = softShadow(W, fh, pad, 5, "rgba(60,40,45,0.18)", (ctx) => {
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(W - 4, 0);
      ctx.lineTo(W / 2, fh - 2);
      ctx.closePath();
      ctx.fill();
    });
    flapShadowMat = track(
      new MeshBasicMaterial({ map: track(tex(c)), transparent: true, depthWrite: false }),
    );
    const m = new Mesh(track(new PlaneGeometry(W + pad * 2, fh + pad * 2)), flapShadowMat);
    m.position.set(1, H / 2 - fh / 2 - 2, Z_POCKET + 0.3);
    env.add(m);
  }

  // ── wax seal: irregular puddle with a stamped disc + raised heart, split
  // along a jagged crack (halves swap in at the tap) ──
  const R = 21;
  const seal = new Group();
  const [sx, sy] = L(W / 2, H * FOLD - 2);
  seal.position.set(sx, sy, Z_SEAL);
  const sealHalves = [];
  let sealMat;
  let sealWhole;
  {
    const r = rng(42);
    const ph = [r() * 6, r() * 6, r() * 6, r() * 6];
    // low-frequency lobes = poured wax; high = the squashed rim
    const rad = (a) =>
      R *
      (1 +
        0.07 * Math.sin(2 * a + ph[0]) +
        0.05 * Math.sin(3 * a + ph[1]) +
        0.025 * Math.sin(7 * a + ph[2]) +
        0.012 * Math.sin(13 * a + ph[3]));

    const S = 64; // bump canvas box covers [-32, 32]
    const bump = makeCanvas(S, S, 4);
    const bc = bump.ctx;
    bc.translate(S / 2, S / 2);
    // overflowed rim: high and lumpy
    bc.fillStyle = "#c8c8c8";
    bc.fillRect(-S, -S, S * 2, S * 2);
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2;
      const rr = rad(a) * (0.78 + r() * 0.2);
      const g = bc.createRadialGradient(
        Math.cos(a) * rr,
        Math.sin(a) * rr,
        0,
        Math.cos(a) * rr,
        Math.sin(a) * rr,
        4,
      );
      g.addColorStop(0, r() > 0.5 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      bc.fillStyle = g;
      bc.fillRect(-S, -S, S * 2, S * 2);
    }
    // stamped disc: pressed flat and lower, with a soft shoulder
    bc.shadowColor = "#6a6a6a";
    bc.shadowBlur = 3;
    bc.fillStyle = "#6a6a6a";
    bc.beginPath();
    bc.arc(0, 0, 14.5, 0, Math.PI * 2);
    bc.fill();
    bc.shadowBlur = 0;
    // engraved border ring + raised heart (the seal die is engraved, so the
    // design stands up out of the wax)
    bc.strokeStyle = "#8a8a8a";
    bc.lineWidth = 0.9;
    bc.beginPath();
    bc.arc(0, 0, 12.3, 0, Math.PI * 2);
    bc.stroke();
    bc.fillStyle = "#8a8a8a";
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      bc.beginPath();
      bc.arc(Math.cos(a) * 10.6, Math.sin(a) * 10.6, 0.45, 0, Math.PI * 2);
      bc.fill();
    }
    bc.shadowColor = "#b4b4b4";
    bc.shadowBlur = 1.5;
    bc.fillStyle = "#b4b4b4";
    heartPath(bc, 0, 0.8, 0.62);
    bc.fill();
    const bumpTex = track(tex(bump.c, false));
    // extrude caps use shape coords as UVs: map [-32, 32] → [0, 1]
    bumpTex.repeat.set(1 / S, 1 / S);
    bumpTex.offset.set(0.5, 0.5);

    sealMat = track(
      new MeshPhysicalMaterial({
        color: WAX,
        roughness: 0.48,
        clearcoat: 0.7,
        clearcoatRoughness: 0.35,
        sheen: 0.4,
        sheenRoughness: 0.5,
        sheenColor: 0xd98aa0,
        bumpMap: bumpTex,
        bumpScale: 3,
        transparent: true,
      }),
    );

    const ex = {
      depth: 1.2,
      bevelEnabled: true,
      bevelThickness: 2.6,
      bevelSize: 2.4,
      bevelSegments: 6,
      curveSegments: 8,
    };
    const outline = (from, to, steps) => {
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        pts.push([Math.cos(a) * rad(a), Math.sin(a) * rad(a)]);
      }
      return pts;
    };
    const poly = (pts) => {
      const s = new Shape();
      pts.forEach((p, i) => (i ? s.lineTo(...p) : s.moveTo(...p)));
      s.closePath();
      return s;
    };
    const crack = [];
    for (let i = 0; i <= 7; i++) {
      const y = R - (2 * R * i) / 7;
      crack.push([i === 0 || i === 7 ? 0 : (r() - 0.5) * 7, y]);
    }
    crack[0][1] = rad(Math.PI / 2);
    crack[7][1] = -rad(-Math.PI / 2);
    const left = poly([...outline(Math.PI / 2, (3 * Math.PI) / 2, 32), ...crack.slice().reverse()]);
    const right = poly([...outline(-Math.PI / 2, Math.PI / 2, 32), ...crack]);
    [left, right].forEach((shape) => {
      const m = new Mesh(track(new ExtrudeGeometry(shape, ex)), sealMat);
      m.visible = false;
      seal.add(m);
      sealHalves.push(m);
    });
    sealWhole = new Mesh(
      track(new ExtrudeGeometry(poly(outline(0, Math.PI * 2, 72)), ex)),
      sealMat,
    );
    seal.add(sealWhole);
    seal.rotation.z = -0.12; // hand-pressed, never perfectly square
  }
  env.add(seal);

  // Baked shadow under the wax, on the flap
  let sealShadowMat;
  {
    const pad = 14;
    const d = R * 2 + 8;
    const c = softShadow(d, d, pad, 3, "rgba(50,20,30,0.45)", (ctx) => {
      ctx.beginPath();
      ctx.arc(d / 2, d / 2, R + 1, 0, Math.PI * 2);
      ctx.fill();
    });
    sealShadowMat = track(
      new MeshBasicMaterial({ map: track(tex(c)), transparent: true, depthWrite: false }),
    );
    const m = new Mesh(track(new PlaneGeometry(d + pad * 2, d + pad * 2)), sealShadowMat);
    m.position.set(sx + 1.5, sy - 2.5, Z_FLAP + 0.3);
    env.add(m);
  }

  // Soft ambient shadow on the table (the shadow map handles the crisp
  // shadows between layers; this is the big diffuse one)
  let shadowMat;
  let contactShadow;
  {
    const { c, ctx } = makeCanvas(256, 128, 1);
    ctx.scale(2, 1); // ellipse: circle in a 128×128 box stretched wide
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(70,45,55,0.20)");
    g.addColorStop(0.55, "rgba(70,45,55,0.08)");
    g.addColorStop(1, "rgba(70,45,55,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    shadowMat = track(
      new MeshBasicMaterial({ map: track(tex(c)), transparent: true, depthWrite: false }),
    );
    const s = new Mesh(track(new PlaneGeometry(W * 1.35, H * 0.95)), shadowMat);
    s.position.set(8, -22, -30);
    env.add(s);
    // tight contact shadow hugging the paper's edge — defines the silhouette
    const cs = softShadow(W, H, 20, 5, "rgba(60,40,45,0.32)", (ctx) => {
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, CORNER);
      ctx.fill();
    });
    const contactMat = track(
      new MeshBasicMaterial({ map: track(tex(cs)), transparent: true, depthWrite: false }),
    );
    const contact = new Mesh(track(new PlaneGeometry(W + 40, H + 40)), contactMat);
    contact.position.set(1.5, -3, -2);
    contactShadow = contact;
    env.add(contact);
  }

  // dissolve background quad (only visible during dissolve)
  const bgU = {
    uRadius: { value: -1 },
    uOrigin: { value: new Vector2() },
    uView: { value: new Vector2() },
    uDpr: { value: dpr },
  };
  const bg = new Mesh(
    track(new PlaneGeometry(1, 1)),
    track(
      new ShaderMaterial({
        uniforms: bgU,
        vertexShader: PAPER_VERT,
        fragmentShader: BG_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    ),
  );
  bg.visible = false;
  bg.renderOrder = -1;
  scene.add(bg);

  // ── layout: camera so that z=0 is 1 unit = 1 CSS px; envelope over the
  // DOM tap target ──
  let vw = 0;
  let vh = 0;
  const home = { x: 0, y: 0 };
  function layout() {
    vw = innerWidth;
    vh = innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.position.set(0, 0, vh / 2 / Math.tan(((FOV / 2) * Math.PI) / 180));
    camera.updateProjectionMatrix();
    const r = body.getBoundingClientRect();
    home.x = r.left + r.width / 2 - vw / 2;
    home.y = vh / 2 - (r.top + r.height / 2);
    bg.scale.set(vw, vh, 1);
    [cardU, bgU].forEach((u) => u.uView.value.set(vw, vh));
    if (OG) {
      home.x = 0;
      home.y = OG.y ?? 0;
      env.scale.setScalar(OG.zoom ?? 1);
    }
  }
  layout();
  addEventListener("resize", layout);

  // ── render loop + idle life ──
  let idle = true;
  let paused = false;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const idleLift = { v: OG ? 0 : 1 };
  let raf = 0;
  const t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    tilt.x += (tilt.tx - tilt.x) * 0.08;
    tilt.y += (tilt.ty - tilt.y) * 0.08;
    const float = Math.sin(t * 1.4) * 4 * idleLift.v;
    env.position.x = home.x;
    env.position.y = home.y + float;
    // faces the pointer: right → turns right, up → tips up (top recedes)
    env.rotation.y = tilt.x * 0.22 + Math.sin(t * 0.55) * 0.02 * idleLift.v;
    env.rotation.x = tilt.y * 0.18 + Math.cos(t * 0.45) * 0.015 * idleLift.v;
    // light hangs up-left of the viewer; tilting sweeps the highlight
    glint.position.set(
      home.x - 90 - tilt.x * 260,
      home.y + 150 + tilt.y * 220,
      300,
    );
    // capture: a still photo needs the foil caught mid-glint — a soft lamp
    // just above the names, near the lens axis, so the metal reads rose-gold
    if (OG) glint.position.set(home.x + 40, home.y - 230, 900);
    if (!paused) renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  const envMats = [];
  env.traverse((o) => {
    if (!o.isMesh || o === card) return;
    if (o.material === shadowMat || o.material === sealMat) return;
    if (o === contactShadow) return;
    if (o.material === flapShadowMat || o.material === sealShadowMat) return;
    if (!envMats.includes(o.material)) envMats.push(o.material);
  });
  // transparent from the start — flipping it during the fade would
  // recompile shaders mid-animation
  envMats.forEach((m) => (m.transparent = true));
  layout();
  renderer.compile(scene, camera);
  if (opts.closing) return closingControls(opts.closing);

  overlay.appendChild(canvas);
  overlay.classList.add("env3d");
  raf = requestAnimationFrame(frame);
  if (OG?.tilt) setTilt(...OG.tilt);

  // ── API ──
  function setTilt(nx, ny) {
    tilt.tx = Math.max(-1, Math.min(1, nx));
    tilt.ty = Math.max(-1, Math.min(1, ny));
  }

  function burst() {
    const geo = track(new CircleGeometry(1, 10));
    for (let i = 0; i < 12; i++) {
      const m = new MeshBasicMaterial({
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        transparent: true,
      });
      const p = new Mesh(geo, m);
      // wax chips: small, slightly irregular
      p.scale.set(1.4 + Math.random() * 1.6, 1 + Math.random() * 1.2, 1);
      p.rotation.z = Math.random() * Math.PI;
      p.position.set(sx, sy, Z_SEAL + 4);
      env.add(p);
      const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const d = 30 + Math.random() * 30;
      gsap.to(p.position, {
        x: sx + Math.cos(a) * d,
        y: sy + Math.sin(a) * d - 10,
        z: Z_SEAL + 4 + Math.random() * 24,
        duration: 0.6 + Math.random() * 0.25,
        ease: "power2.out",
      });
      gsap.to(m, {
        opacity: 0,
        duration: 0.7,
        ease: "power1.in",
        onComplete: () => {
          env.remove(p);
          m.dispose();
        },
      });
    }
  }

  // Plays the opening; resolves once the card sits flat on `target`
  // (a DOMRect of the open letter) looking exactly like the blank letter.
  function open(target) {
    idle = false;
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      const [lh, rh] = sealHalves;
      tl.to(tilt, { tx: 0, ty: 0, duration: 0.3 }, 0)
        .to(idleLift, { v: 0, duration: 0.4 }, 0)
        // seal cracks in two and drops away
        .to(seal.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 0.16, ease: "power2.out" }, 0)
        .add(burst, 0.16)
        .call(
          () => {
            sealWhole.visible = false;
            sealHalves.forEach((h) => (h.visible = true));
          },
          null,
          0.17,
        )
        .to(lh.position, { x: -8, y: -5, z: 5, duration: 0.45, ease: "power2.out" }, 0.18)
        .to(rh.position, { x: 8, y: -3, z: 5, duration: 0.45, ease: "power2.out" }, 0.18)
        .to(lh.rotation, { z: 0.4, y: -0.55, duration: 0.45 }, 0.18)
        .to(rh.rotation, { z: -0.35, y: 0.55, duration: 0.45 }, 0.18)
        .to(seal.scale, { x: 0, y: 0, z: 0, duration: 0.3, ease: "back.in(1.8)" }, 0.36)
        .to(sealMat, { opacity: 0, duration: 0.25 }, 0.4)
        .to(sealShadowMat, { opacity: 0, duration: 0.2 }, 0.18)
        .to(flapShadowMat, { opacity: 0, duration: 0.3, ease: "power1.out" }, 0.45)
        // flap swings toward the viewer, over the top and settles tilted
        // back behind the envelope plane (so the rising card passes in front)
        .to(flap.rotation, { x: -Math.PI * 1.1, duration: 1.15, ease: "back.out(1.3)" }, 0.45)
        // past vertical the flap drops behind the card layer, so the
        // rising card passes in front of the hinge (no hard cut line)
        .set(flap.position, { z: -0.6 }, 0.82)
        .to(linerMat.color, { r: 1, g: 1, b: 1, duration: 0.7, ease: "power1.out" }, 0.85)
        // card rises out of the pocket
        .to(card.position, { y: cardY + 132, duration: 1.0, ease: "back.out(1.1)" }, 1.15)
        .to(cardU.uShade, { value: 0, duration: 0.8 }, 1.15)
        .call(liftOff, null, 2.35)
        .add(fly(target), 2.35);
    });
  }

  function liftOff() {
    scene.attach(card); // keep world transform, now free of the envelope
    card.material.depthTest = false;
    card.renderOrder = 10;
  }

  // Card leaves the envelope and lands on the DOM letter rect
  function fly(target) {
    const tx = target.left + target.width / 2 - vw / 2;
    const ty = vh / 2 - (target.top + target.height / 2);
    const size = { w: CARD_W, h: CARD_H };
    const syncScale = () => {
      cardU.uSize.value.set(size.w, size.h);
      card.scale.set(size.w + 2 * MARGIN, size.h + 2 * MARGIN, 1);
    };
    const D = 0.95;
    const f = gsap.timeline();
    f.to(card.position, { x: tx, y: ty, z: 0, duration: D, ease: "power3.inOut" }, 0)
      .to(card.rotation, { x: 0, z: 0, duration: D, ease: "power3.inOut" }, 0)
      // a small lift-and-turn mid-flight so it reads as a held card
      .to(card.rotation, { y: -0.28, duration: D * 0.45, ease: "sine.out" }, 0)
      .to(card.rotation, { y: 0, duration: D * 0.55, ease: "sine.inOut" }, D * 0.45)
      .to(size, { w: target.width, h: target.height, duration: D, ease: "power3.inOut", onUpdate: syncScale }, 0)
      .to(cardU.uRadiusPx, { value: 1.5, duration: D, ease: "power3.inOut" }, 0)
      .to(cardU.uMix, { value: 1, duration: D * 0.6, ease: "power1.inOut" }, D * 0.15)
      .to(cardU.uShadow, { value: 1, duration: D, ease: "power2.out" }, 0)
      // the emptied envelope bows out beneath
      .to(env.position, { z: -260, duration: 0.85, ease: "power2.inOut" }, 0)
      .to(home, { y: home.y - 60, duration: 0.85, ease: "power2.inOut" }, 0)
      .to([shadowMat, contactShadow.material], { opacity: 0, duration: 0.5 }, 0);
    envMats.forEach((m) =>
      f.to(m, { opacity: 0, duration: 0.7, ease: "power1.in" }, 0.1),
    );
    return f;
  }

  // Hide the WebGL card the frame the DOM letter becomes visible
  function handOff() {
    card.visible = false;
    env.visible = false;
    paused = true;
    renderer.clear();
  }

  // Dissolve radius over time — shared with the petal names
  let dissolveInfo = null;
  function growRadius(t) {
    if (!dissolveInfo) return t * 600;
    const k = Math.min(1, Math.max(0, t / dissolveInfo.dur));
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    return e * dissolveInfo.maxR;
  }

  // Overlay + blank paper melt away from `origin` (CSS px). The caller
  // makes the DOM overlay/paper transparent so only the text floats above.
  function dissolve(origin, paperRect, dur = 1.2) {
    const maxR =
      Math.max(
        Math.hypot(origin.x, origin.y),
        Math.hypot(vw - origin.x, origin.y),
        Math.hypot(origin.x, vh - origin.y),
        Math.hypot(vw - origin.x, vh - origin.y),
      ) + 120;
    dissolveInfo = { dur, maxR };
    // paper back on screen, exactly where the DOM letter is now
    const tx = paperRect.left + paperRect.width / 2 - vw / 2;
    const ty = vh / 2 - (paperRect.top + paperRect.height / 2);
    card.position.set(tx, ty, 0);
    card.rotation.set(0, 0, 0);
    cardU.uSize.value.set(paperRect.width, paperRect.height);
    card.scale.set(paperRect.width + 2 * MARGIN, paperRect.height + 2 * MARGIN, 1);
    card.visible = true;
    bg.visible = true;
    paused = false;
    const r = { v: -40 };
    const apply = () => {
      [cardU, bgU].forEach((u) => {
        u.uRadius.value = r.v;
        u.uOrigin.value.set(origin.x, origin.y);
      });
    };
    apply();
    // paint now, in the same task the DOM paper turns transparent — waiting
    // for the next rAF would flash the page through for one frame
    renderer.render(scene, camera);
    return new Promise((resolve) => {
      gsap.to(r, {
        v: maxR,
        duration: dur,
        ease: "power3.inOut",
        onUpdate: apply,
        onComplete: resolve,
      });
    });
  }

  function dispose() {
    cancelAnimationFrame(raf);
    removeEventListener("resize", layout);
    gsap.killTweensOf([tilt, idleLift, home]);
    disposables.forEach((d) => d.dispose?.());
    scene.environment?.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    overlay.classList.remove("env3d");
  }

  // ── Closing (finale.js): the page's last sheet folds in thirds, slides
  // into this same envelope, the flap shuts and the wax seal presses — all
  // scrubbed by scroll progress 0..1; scrolling back reverses it and the
  // seal cracks. Nothing idles: frames render only while something moves.
  function closingControls({ sheetEl, sheetCanvas, onStamped }) {
    idle = false;
    card.visible = false;
    overlay.appendChild(canvas);
    canvas.style.visibility = "hidden";

    // the envelope waits open and empty
    flap.rotation.x = -Math.PI * 1.1;
    flap.position.z = -0.6;
    linerMat.color.setScalar(1);
    flapShadowMat.opacity = 0;
    seal.scale.setScalar(0.001);
    sealShadowMat.opacity = 0;

    // the sheet: three panels hinged at the thirds — front = the letter
    // (the very canvas the DOM sheet shows), back = blank stock. Unlit, so
    // the hand-over frame is pixel-identical to the DOM. Both outer thirds
    // fold BACK, so "With love, …" in foil stays facing the guest all the
    // way into the envelope.
    const sheetTex = track(tex(sheetCanvas));
    const panels = [];
    const panel = (v0) => {
      const geo = track(new PlaneGeometry(1, 1));
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) / 3);
      const front = track(new MeshBasicMaterial({ map: sheetTex, toneMapped: false }));
      const back = track(
        new MeshBasicMaterial({ color: 0xfffdf9, toneMapped: false, side: BackSide }),
      );
      const g = new Group();
      g.add(new Mesh(geo, front), new Mesh(geo, back));
      panels.push([
        [front, front.color.clone()],
        [back, back.color.clone()],
      ]);
      return g;
    };
    const sheet = new Group();
    const mid = panel(1 / 3);
    const topHinge = new Group();
    const top = panel(2 / 3);
    const botHinge = new Group();
    const bot = panel(0);
    topHinge.add(top);
    botHinge.add(bot);
    // stacked behind the middle third (top folds last → furthest back)
    topHinge.position.z = -0.6;
    botHinge.position.z = -0.3;
    sheet.add(mid, topHinge, botHinge);
    sheet.visible = false;
    scene.add(sheet);

    // scrubbed state, 0..1 each; transforms are derived live in apply()
    const st = { lift: 0, fb: 0, ft: 0, rise: 0, travel: 0, drop: 0, flap: 0 };
    const tl = gsap
      .timeline({ paused: true })
      .to(st, { lift: 1, duration: 0.04, ease: "power1.out" }, 0)
      .to(st, { fb: 1, duration: 0.15, ease: "power2.inOut" }, 0.04)
      .to(st, { ft: 1, duration: 0.15, ease: "power2.inOut" }, 0.17)
      .to(st, { rise: 1, duration: 0.24, ease: "power2.out" }, 0.26)
      .to(st, { travel: 1, duration: 0.2, ease: "power2.inOut" }, 0.31)
      .to(st, { drop: 1, duration: 0.16, ease: "power2.in" }, 0.55)
      .to(st, { flap: 1, duration: 0.16, ease: "power2.inOut" }, 0.72)
      .to({}, { duration: 0.12 }, 0.88); // settle → timeline ends at 1.0

    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    function apply() {
      const r = sheetEl.getBoundingClientRect();
      const a = body.getBoundingClientRect();
      const hx = a.left + a.width / 2 - vw / 2;
      const hy = vh / 2 - (a.top + a.height / 2);
      const w = r.width;
      const h = r.height;
      // envelope: rises from below the screen to its resting place
      env.visible = st.rise > 0.001;
      env.position.set(hx, hy - (1 - st.rise) * vh * 0.8, 0);
      env.rotation.set(0, 0, 0);
      glint.position.set(hx - 90, hy + 150, 300);
      flap.rotation.x = -Math.PI * 1.1 * (1 - st.flap);
      flap.position.z = st.flap > 0.45 ? Z_FLAP : -0.6; // past vertical
      linerMat.color.setScalar(1 - 0.14 * st.flap);
      flapShadowMat.opacity = smooth(0.8, 1, st.flap);
      // sheet: thirds, hinged; each panel darkens as it turns from the light
      [mid, top, bot].forEach((m) => m.scale.set(w, h / 3, 1));
      top.position.y = h / 6;
      bot.position.y = -h / 6;
      topHinge.position.y = h / 6;
      botHinge.position.y = -h / 6;
      // (nearly flat against the back: a panel tip left standing would poke
      // through the pocket in front of it)
      const tb = (Math.PI - 0.004) * st.fb;
      const tt = (Math.PI - 0.004) * st.ft;
      botHinge.rotation.x = tb;
      topHinge.rotation.x = -tt;
      const shade = (i, t) =>
        panels[i].forEach(([m, base]) =>
          m.color.copy(base).multiplyScalar(1 - 0.22 * Math.sin(t)),
        );
      shade(2, tb);
      shade(1, tt);
      // …then it travels over the envelope's mouth and drops into the pocket
      const fit = Math.min(1, (CARD_W - 10) / w);
      const x0 = r.left + w / 2 - vw / 2;
      const y0 = vh / 2 - (r.top + h / 2);
      const hover = hy + H / 2 + (h / 3) * fit * 0.5 + 18;
      const inside = hy - 8;
      const y = lerp(lerp(y0, hover, st.travel), inside, st.drop);
      // inside: between the envelope's back (z 0) and its pocket (z 2)
      sheet.position.set(lerp(x0, hx, st.travel), y, lerp(30 * st.lift, 1.5, st.drop));
      sheet.scale.setScalar(lerp(1, fit, st.travel));
      sheet.rotation.x = -0.12 * st.lift * (1 - st.travel);
    }

    let renderUntil = 0;
    const dirty = (ms = 120) => (renderUntil = Math.max(renderUntil, performance.now() + ms));
    const tick = () => {
      if (performance.now() > renderUntil) return;
      apply();
      renderer.render(scene, camera);
    };
    gsap.ticker.add(tick);

    // the seal is pressed (and cracked) in real time, not scrubbed
    let stamped = false;
    const [lh, rh] = sealHalves;
    function stamp() {
      stamped = true;
      gsap.killTweensOf([seal.scale, sealMat, sealShadowMat, lh.position, rh.position]);
      sealHalves.forEach((m) => {
        m.visible = false;
        m.position.set(0, 0, 0);
        m.rotation.set(0, 0, 0);
      });
      sealWhole.visible = true;
      sealMat.opacity = 1;
      gsap.fromTo(
        seal.scale,
        { x: 1.8, y: 1.8, z: 1.8 },
        { x: 1, y: 1, z: 1, duration: 0.42, ease: "back.out(2.4)" },
      );
      gsap.fromTo(sealShadowMat, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.15 });
      navigator.vibrate?.(12);
      dirty(900);
      onStamped?.();
    }
    function crack() {
      stamped = false;
      burst();
      sealWhole.visible = false;
      sealHalves.forEach((m) => (m.visible = true));
      gsap.to(lh.position, { x: -8, y: -5, z: 5, duration: 0.4, ease: "power2.out" });
      gsap.to(rh.position, { x: 8, y: -3, z: 5, duration: 0.4, ease: "power2.out" });
      gsap.to(sealShadowMat, { opacity: 0, duration: 0.2 });
      gsap.to(sealMat, { opacity: 0, duration: 0.35, delay: 0.15 });
      gsap.to(seal.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: 0.3,
        delay: 0.3,
        ease: "back.in(1.8)",
      });
      navigator.vibrate?.(8);
      dirty(1000);
    }

    let last = 0;
    function setProgress(p) {
      const shown = p > 0.003;
      sheet.visible = shown;
      canvas.style.visibility = shown ? "visible" : "hidden";
      sheetEl.style.visibility = shown ? "hidden" : ""; // swap in one frame
      tl.progress(p);
      if (!stamped && p >= 0.9) stamp();
      if (stamped && p < 0.86) crack();
      last = p;
      dirty();
      tick(); // paint in the same task the DOM sheet hides
    }

    return {
      setProgress,
      // the page moved under a still scene (past the runway): repaint
      redraw: () => dirty(),
      get progress() {
        return last;
      },
      get stamped() {
        return stamped;
      },
      dispose() {
        gsap.ticker.remove(tick);
        tl.kill();
        sheetEl.style.visibility = "";
        dispose();
      },
    };
  }

  // The open letter's sheet (paper.js letterPaper) — the card lands as it
  function setLetterPaper({ face, shadow }) {
    const f = track(tex(face, false));
    const s = track(tex(shadow, false));
    cardU.uLetterFace.value = f;
    cardU.uLetterShadow.value = s;
    cardU.uHasLetter.value = 1;
    renderer.initTexture(f);
    renderer.initTexture(s);
  }

  return { setTilt, open, handOff, dissolve, growRadius, dispose, setLetterPaper };
}
