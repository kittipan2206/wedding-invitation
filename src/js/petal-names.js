// Petals that assemble into the couple's names in the hero.
//  - assembleNames({ origin, growRadius }) — intro: petals peel off the
//    dissolving letter's edge (a ring growing from `origin`) and fly into
//    the names, then the real text fades in and the petals drift away
//  - tapping the names scatters them into petals that swirl back (toy)
// Canvas 2D only; targets are sampled from the names drawn at their DOM
// rects in a heavier weight (the real 300-weight strokes are too thin to
// read as petals — ไม้ทัณฑฆาต would vanish).

const COLORS = ["#F9C8D4", "#ED93B1", "#C9B8E8", "#B8D8F8", "#F8D8B8"];
const FLY = 1.15; // seconds for a petal to reach its spot
const HOLD = 0.25;
const FADE = 0.6;

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let canvas = null;
let ctx = null;
let sprites = null;
let running = false;

function petalCount() {
  // ponytail: core count as the only device-tier signal (Safari has no deviceMemory)
  return (navigator.hardwareConcurrency || 4) < 4 ? 200 : 400;
}

function setupCanvas() {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "petal-names-canvas";
    canvas.setAttribute("aria-hidden", "true");
    // Above the envelope overlay (999): petals emerge from its dissolving edge
    canvas.style.cssText =
      "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:1000;";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  canvas.style.display = "block";
  return dpr;
}

function makeSprites(size) {
  return COLORS.map((color) => {
    const s = document.createElement("canvas");
    s.width = s.height = size * 2;
    const c = s.getContext("2d");
    c.translate(size, size);
    const g = c.createRadialGradient(-size * 0.2, -size * 0.3, 0, 0, 0, size);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, color);
    g.addColorStop(1, color);
    c.fillStyle = g;
    // teardrop petal: rounded at the tip, pinched at the base
    c.beginPath();
    c.moveTo(0, size * 0.95);
    c.bezierCurveTo(size * 0.9, size * 0.3, size * 0.6, -size * 0.9, 0, -size * 0.9);
    c.bezierCurveTo(-size * 0.6, -size * 0.9, -size * 0.9, size * 0.3, 0, size * 0.95);
    c.fill();
    return s;
  });
}

// Sample target points (viewport px) from the names at their DOM positions
export function sampleNameTargets(namesEl, count) {
  const parts = namesEl.querySelectorAll(
    ".hero-name--first, .ampersand, .hero-name--second",
  );
  const box = namesEl.getBoundingClientRect();
  const pad = 20;
  const w = Math.ceil(box.width + pad * 2);
  const h = Math.ceil(box.height + pad * 2);
  if (w < 4 || h < 4) return { points: [], step: 1 };
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const c = off.getContext("2d", { willReadFrequently: true });
  c.fillStyle = "#000";
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  parts.forEach((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    c.font = `${cs.fontStyle} 600 ${cs.fontSize} ${cs.fontFamily}`;
    const text = el.textContent.trim();
    const m = c.measureText(text);
    const ascent = m.actualBoundingBoxAscent || parseFloat(cs.fontSize) * 0.7;
    const descent = m.actualBoundingBoxDescent || 0;
    // centre the ink box inside the element's box
    const cx = r.left + r.width / 2 - box.left + pad;
    const cy = r.top + r.height / 2 - box.top + pad;
    c.fillText(text, cx, cy + (ascent - descent) / 2);
  });
  const data = c.getImageData(0, 0, w, h).data;
  // pick a grid step that yields ~count points
  let ink = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] > 128) ink++;
  const area = ink * 4;
  const step = Math.max(1.5, Math.sqrt(area / count));
  const pts = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const a = data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3];
      if (a > 128)
        pts.push({ x: x + box.left - pad, y: y + box.top - pad });
    }
  }
  // shuffle so capping keeps an even spread
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return { points: pts.slice(0, count), step };
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// petals: [{ sx, sy, tx, ty, delay, born? }] — animates start → target,
// holds, fades the DOM names in, then lets the petals fall away
function run(namesEl, petals, step, onDone) {
  const dpr = setupCanvas();
  const size = Math.max(3, step * 0.95);
  sprites = makeSprites(Math.ceil(size * dpr));
  const top0 = namesEl.getBoundingClientRect().top;
  petals.forEach((p, i) => {
    p.sprite = sprites[i % sprites.length];
    p.rot0 = Math.random() * Math.PI * 2;
    p.spin = (Math.random() - 0.5) * 8;
    p.restRot = (Math.random() - 0.5) * 1.2;
    // swirl: control point pushed sideways off the straight path
    const dx = p.tx - p.sx;
    const dy = p.ty - p.sy;
    const bend = (Math.random() - 0.5) * 0.9;
    p.cx = p.sx + dx * 0.5 - dy * bend;
    p.cy = p.sy + dy * 0.5 + dx * bend - 60;
    p.fallV = 20 + Math.random() * 60;
    p.sway = Math.random() * Math.PI * 2;
  });
  const lastArrive = Math.max(...petals.map((p) => p.delay)) + FLY;
  let released = false;
  const t0 = performance.now();

  function frame(now) {
    const t = (now - t0) / 1000;
    // follow the names if the page scrolls mid-flight
    const scrollDy = namesEl.getBoundingClientRect().top - top0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!released && t >= lastArrive + HOLD) {
      released = true;
      namesEl.style.transition = `opacity ${FADE}s ease`;
      namesEl.style.opacity = "";
    }
    const fadeT = released ? clamp01((t - lastArrive - HOLD) / (FADE + 0.6)) : 0;
    if (fadeT >= 1) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = "none";
      namesEl.style.transition = "";
      running = false;
      onDone?.();
      return;
    }

    for (const p of petals) {
      const k = clamp01((t - p.delay) / FLY);
      if (k <= 0 && p.born) continue; // not peeled off the edge yet
      const e = easeOutCubic(k);
      const u = 1 - e;
      let x = u * u * p.sx + 2 * u * e * p.cx + e * e * p.tx;
      let y = u * u * p.sy + 2 * u * e * p.cy + e * e * (p.ty + scrollDy);
      let rot = p.rot0 + p.spin * (1 - e) + p.restRot * e;
      let alpha = p.born ? clamp01(k * 4) : 1;
      let scale = p.born ? 0.4 + 0.6 * clamp01(k * 2) : 1;
      if (released) {
        const ft = t - lastArrive - HOLD;
        y += p.fallV * ft + 30 * ft * ft;
        x += Math.sin(p.sway + ft * 3) * 12 * ft;
        rot += ft * p.spin * 0.3;
        alpha *= 1 - fadeT;
      }
      // sprites are pre-rendered at device resolution: only rotate + scale
      const cos = Math.cos(rot) * scale;
      const sin = Math.sin(rot) * scale;
      ctx.globalAlpha = alpha;
      ctx.setTransform(cos, sin, -sin, cos, x * dpr, y * dpr);
      ctx.drawImage(p.sprite, -p.sprite.width / 2, -p.sprite.height / 2);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Intro: petals peel off a ring that grows from `origin` (the dissolving
// letter's edge) and fly into the names.
// growRadius(t) → ring radius (px) t seconds after the dissolve began.
export function assembleNames({ origin, growRadius, peel = [0.12, 0.85] } = {}) {
  const namesEl = document.querySelector(".hero-names");
  if (!namesEl || running || reduceMotion()) return false;
  const sample = sampleNameTargets(namesEl, petalCount());
  if (!sample.points?.length) return false;
  running = true;
  namesEl.style.transition = "";
  namesEl.style.opacity = "0";
  const o = origin || { x: innerWidth / 2, y: innerHeight * 0.6 };
  const grow = growRadius || ((t) => t * Math.hypot(innerWidth, innerHeight));
  const petals = sample.points.map((pt) => {
    const delay = peel[0] + Math.random() * (peel[1] - peel[0]);
    const a = Math.random() * Math.PI * 2;
    const r = grow(delay);
    return {
      sx: o.x + Math.cos(a) * r,
      sy: o.y + Math.sin(a) * r,
      tx: pt.x,
      ty: pt.y,
      delay,
      born: true,
    };
  });
  run(namesEl, petals, sample.step);
  return true;
}

// Toy: the names burst into petals around the tap and swirl back
function scatter(namesEl, tapX, tapY) {
  const sample = sampleNameTargets(namesEl, petalCount());
  if (!sample.points?.length) return;
  running = true;
  namesEl.style.transition = "";
  namesEl.style.opacity = "0";
  const petals = sample.points.map((pt) => {
    const dx = pt.x - tapX;
    const dy = pt.y - tapY;
    const d = Math.hypot(dx, dy) || 1;
    const push = 90 + Math.random() * 140;
    return {
      sx: pt.x + (dx / d) * push + (Math.random() - 0.5) * 60,
      sy: pt.y + (dy / d) * push + (Math.random() - 0.5) * 60,
      tx: pt.x,
      ty: pt.y,
      delay: Math.random() * 0.25,
    };
  });
  run(namesEl, petals, sample.step);
}

export function initPetalNames() {
  // Delegated: injectConfig rewrites .hero-names innerHTML on SWR refresh
  document.addEventListener("click", (e) => {
    const namesEl = e.target.closest?.(".hero-names");
    if (!namesEl || running || reduceMotion()) return;
    if (navigator.vibrate) navigator.vibrate(8);
    scatter(namesEl, e.clientX, e.clientY);
  });
}
