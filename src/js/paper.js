// Procedural paper — generated in the browser, no image assets.
//  - paperTile(kind): seamless tile canvas ("cotton" for the site's paper
//    surfaces, "card" for the personal letter) — smooth stock, faint tooth
//  - applyPaperVars(): publishes the cotton tile as --paper-cotton on :root
//  - letterPaper(w, h, monogram): the personal letter's face (smooth card,
//    square-cut corners, couple's names in pressed rose-gold foil) and its shadow. The DOM
//    letter AND the WebGL card draw these same canvases, so the hand-off
//    between them is pixel-identical.
// Deterministic (seeded), so every guest gets the same sheet.

export const TILE = 256; // CSS px per tile
export const LETTER_MARGIN = 90; // shadow room around the letter, CSS px
const SCALE = 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * SCALE);
  c.height = Math.round(h * SCALE);
  const ctx = c.getContext("2d");
  ctx.scale(SCALE, SCALE);
  return { c, ctx };
}

// Smooth wedding card stock — only a faint tooth up close. (Visible
// fibres / clouds / inclusions read as antique, not bridal.)
const STOCK = {
  cotton: { base: "#fdfaf4", tooth: 0.5, seed: 11 },
  card: { base: "#fffdf9", tooth: 0.6, seed: 23 },
};

const tiles = {};
export function paperTile(kind = "cotton") {
  if (tiles[kind]) return tiles[kind];
  const k = STOCK[kind];
  const { c, ctx } = canvas(TILE, TILE);
  const r = rng(k.seed);
  ctx.fillStyle = k.base;
  ctx.fillRect(0, 0, TILE, TILE);
  // fine tooth (sub-pixel specks never cross the edge, so it tiles)
  for (let i = 0; i < TILE * TILE * 0.08; i++) {
    ctx.fillStyle = r() > 0.5
      ? `rgba(255,255,255,${0.08 * k.tooth})`
      : `rgba(110,90,80,${0.035 * k.tooth})`;
    ctx.fillRect(r() * TILE, r() * TILE, 0.5, 0.5);
  }
  tiles[kind] = c;
  return c;
}

export function applyPaperVars() {
  const c = paperTile("cotton");
  c.toBlob((b) => {
    if (!b) return;
    const url = URL.createObjectURL(b);
    const root = document.documentElement.style;
    root.setProperty("--paper-cotton", `url("${url}")`);
    root.setProperty("--paper-tile", `${TILE}px`);
  });
}

// ── Personal letter ──────────────────────────────────────────────────────

// Guillotine-cut sheet: corners are square to the eye (a hair of rounding
// from the blade, never an app-card radius)
const CARD_RADIUS = 1.5;
function cardEdge(w, h) {
  const p = new Path2D();
  p.roundRect(0.5, 0.5, w - 1, h - 1, CARD_RADIUS);
  return p;
}

// Couple's names pressed in rose-gold foil, top centre — the envelope's foil again
export const MONOGRAM_Y = 30; // CSS px from the top edge (baseline)
export function foilMonogram(ctx, w, text, size = 19, y = MONOGRAM_Y) {
  const font = `italic 400 ${size}px "Cormorant Garamond", "Trirong", serif`;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center";
  // the foil is pressed in: a hairline shadow under, a light edge above
  ctx.fillStyle = "rgba(90,60,55,0.18)";
  ctx.fillText(text, w / 2, y + size * 0.03);
  const g = ctx.createLinearGradient(0, y - size * 0.84, 0, y + size * 0.21);
  g.addColorStop(0, "#ecc9bd");
  g.addColorStop(0.5, "#c98f80");
  g.addColorStop(1, "#a86f63");
  ctx.fillStyle = g;
  ctx.fillText(text, w / 2, y);
  ctx.restore();
}

const letterCache = new Map();
// → { face, shadow } canvases. face is w×h, shadow is (w+2M)×(h+2M), both
// at 2× — use them 1:1 on the letter's CSS box (shadow offset by −M).
export function letterPaper(w, h, monogram = "") {
  w = Math.round(w);
  h = Math.round(h);
  const key = `${w}x${h}:${monogram}`;
  if (letterCache.has(key)) return letterCache.get(key);
  const edge = cardEdge(w, h);

  const { c: face, ctx } = canvas(w, h);
  ctx.save();
  ctx.clip(edge);
  const tile = paperTile("card");
  const pat = ctx.createPattern(tile, "repeat");
  pat.setTransform(new DOMMatrix().scale(1 / SCALE));
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  if (monogram) foilMonogram(ctx, w, monogram);
  // hairline edge, like the cut edge of thick card catching the light
  ctx.strokeStyle = "rgba(80,60,70,0.10)";
  ctx.lineWidth = 1;
  ctx.stroke(edge);
  ctx.restore();

  const M = LETTER_MARGIN;
  const { c: shadow, ctx: s } = canvas(w + 2 * M, h + 2 * M);
  // only the blurred shadow is painted: the shape sits far off-canvas
  // (shadowBlur, not ctx.filter — canvas filters need iOS 18+)
  const drop = (dy, blur, color) => {
    s.save();
    s.shadowColor = color;
    s.shadowBlur = blur * SCALE;
    s.shadowOffsetX = 10000 * SCALE;
    s.shadowOffsetY = dy * SCALE;
    s.translate(M - 10000, M);
    s.fill(edge);
    s.restore();
  };
  drop(16, 24, "rgba(60,40,50,0.16)");
  drop(1, 1.5, "rgba(60,40,50,0.10)");

  const out = { face, shadow, w, h };
  letterCache.set(key, out);
  return out;
}

// Canvas → object URL for CSS (async; resolves null if encoding fails)
export function canvasURL(c) {
  return new Promise((ok) =>
    c.toBlob((b) => ok(b ? URL.createObjectURL(b) : null)),
  );
}
