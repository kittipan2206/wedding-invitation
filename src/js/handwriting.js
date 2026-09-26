// Real pen-writing reveal for short lines (the letter's salutation and
// signature). Works for any text — including ?to= guest names — because
// strokes are derived at runtime: the line is rasterised, thinned to its
// centre-line skeleton (Zhang–Suen), traced into strokes, ordered left to
// right, and a pen "brush" travels along them revealing the real ink.
//
// The DOM text stays in place (transparent) for layout, selection and
// screen readers; a canvas on top shows the ink.
//
// writeTween(el, text) → GSAP tween (0 → 1); .progress(1) = fully written.
import gsap from "gsap";

export const SCRIPT_FONT = `"Charm", "Trirong", serif`;
const PEN_SPEED = 560; // px of stroke per second
const PEN_LIFT = 20; // extra "distance" spent between strokes

// Charm is declared in index.html's font link; this just makes sure the
// face is fetched before the pen needs it (fonts load lazily on first use)
export function loadScriptFont() {
  return Promise.resolve(window.__fontsCss)
    .then(() => document.fonts.load(`400 24px ${SCRIPT_FONT}`, "ถึงคุณ"))
    .catch(() => {});
}

// ── Zhang–Suen thinning on a binary grid (1 = ink) ──
export function thin(img, w, h) {
  const at = (x, y) => img[y * w + x];
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      const del = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (!at(x, y)) continue;
          const p = [
            at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1),
            at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1),
          ];
          const b = p.reduce((s, v) => s + v, 0);
          if (b < 2 || b > 6) continue;
          let a = 0;
          for (let i = 0; i < 8; i++) if (!p[i] && p[(i + 1) % 8]) a++;
          if (a !== 1) continue;
          if (step === 0 ? p[0] * p[2] * p[4] || p[2] * p[4] * p[6] : p[0] * p[2] * p[6] || p[0] * p[4] * p[6])
            continue;
          del.push(y * w + x);
        }
      }
      del.forEach((i) => (img[i] = 0));
      if (del.length) changed = true;
    }
  }
  return img;
}

const N8 = [
  [0, -1], [1, 0], [0, 1], [-1, 0], // 4-connected first: smoother walks
  [1, -1], [1, 1], [-1, 1], [-1, -1],
];

// Trace a skeleton into strokes [[x, y], ...], left-to-right
export function trace(skel, w, h) {
  const seen = new Uint8Array(w * h);
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && skel[y * w + x];
  const degree = (x, y) => N8.reduce((n, [dx, dy]) => n + (on(x + dx, y + dy) ? 1 : 0), 0);
  const pts = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (skel[y * w + x]) pts.push([x, y]);
  const strokes = [];
  const walk = (sx, sy) => {
    const path = [[sx, sy]];
    seen[sy * w + sx] = 1;
    let [x, y] = [sx, sy];
    for (;;) {
      const next = N8.map(([dx, dy]) => [x + dx, y + dy]).find(
        ([nx, ny]) => on(nx, ny) && !seen[ny * w + nx],
      );
      if (!next) break;
      [x, y] = next;
      seen[y * w + x] = 1;
      path.push(next);
    }
    strokes.push(path); // keep even tiny ones: Thai tone marks are short
  };
  // pens start at loose ends; whatever is left are closed loops
  for (const [x, y] of pts) if (!seen[y * w + x] && degree(x, y) === 1) walk(x, y);
  for (const [x, y] of pts) if (!seen[y * w + x]) walk(x, y);
  strokes.sort((a, b) => Math.min(...a.map((p) => p[0])) - Math.min(...b.map((p) => p[0])));
  return strokes;
}

export function writeTween(el, text, { color } = {}) {
  el.textContent = text;
  const cs = getComputedStyle(el);
  const ink = color || cs.color;
  el.style.color = "transparent"; // keeps layout + a11y; the canvas shows ink
  el.style.position = el.style.position || "relative";

  // layout size, not the on-screen rect: the letter may be mid-Flip or tilted
  const box = { width: el.offsetWidth, height: el.offsetHeight };
  const fontPx = parseFloat(cs.fontSize);
  const pad = Math.ceil(fontPx * 0.6); // room for Thai marks above/below
  const W = Math.ceil(box.width + pad * 2);
  const H = Math.ceil(box.height + pad * 2);
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const align = cs.textAlign === "right" || cs.textAlign === "end" ? "right" : "left";

  // 1× analysis raster
  const a = document.createElement("canvas");
  a.width = W;
  a.height = H;
  const actx = a.getContext("2d", { willReadFrequently: true });
  actx.font = font;
  actx.textBaseline = "alphabetic";
  const m = actx.measureText(text);
  const fit = Math.min(1, box.width / Math.max(1, m.width)); // never overflow
  const baseline = pad + (box.height + (m.actualBoundingBoxAscent || fontPx * 0.7) - (m.actualBoundingBoxDescent || 0)) / 2;
  const x0 = align === "right" ? pad + box.width - m.width * fit : pad;
  const drawText = (ctx) => {
    ctx.save();
    ctx.font = font;
    ctx.textBaseline = "alphabetic";
    ctx.translate(x0, baseline);
    ctx.scale(fit, fit);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  drawText(actx);
  const data = actx.getImageData(0, 0, W, H).data;
  const bin = new Uint8Array(W * H);
  let inkPx = 0;
  for (let i = 0; i < W * H; i++) if (data[i * 4 + 3] > 110) (bin[i] = 1), inkPx++;
  const strokes = trace(thin(bin, W, H), W, H);
  const skelLen = strokes.reduce((s, p) => s + p.length, 0) || 1;
  // brush a little wider than the average stroke so it uncovers it fully
  const brush = Math.max(1.4, (inkPx / skelLen) * 0.62 + 0.8);

  // timeline in "pen distance": strokes + lifts between them
  const plan = [];
  let dist = 0;
  strokes.forEach((path) => {
    plan.push({ path, start: dist });
    dist += path.length + PEN_LIFT;
  });
  const total = Math.max(1, dist - PEN_LIFT);

  // display: ink canvas masked by the pen's trail
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W * dpr;
    c.height = H * dpr;
    const x = c.getContext("2d");
    x.scale(dpr, dpr);
    return [c, x];
  };
  const [inkC, inkX] = mk();
  inkX.fillStyle = ink;
  drawText(inkX);
  const [maskC, maskX] = mk();
  maskX.fillStyle = "#000";
  const [view, viewX] = mk();
  view.setAttribute("aria-hidden", "true");
  view.style.cssText = `position:absolute;left:${-pad}px;top:${-pad}px;width:${W}px;height:${H}px;pointer-events:none`;
  el.querySelector("canvas")?.remove();
  el.appendChild(view);

  let drawn = 0;
  function render(p) {
    const d = p * total;
    if (p >= 1) {
      viewX.clearRect(0, 0, W, H);
      viewX.drawImage(inkC, 0, 0, W, H);
      drawn = total;
      return;
    }
    if (d <= drawn) return;
    for (const { path, start } of plan) {
      const from = Math.max(0, Math.floor(drawn - start));
      const to = Math.min(path.length, Math.ceil(d - start));
      for (let i = from; i < to; i++) {
        maskX.beginPath();
        maskX.arc(path[i][0] + 0.5, path[i][1] + 0.5, brush, 0, Math.PI * 2);
        maskX.fill();
      }
    }
    drawn = d;
    viewX.clearRect(0, 0, W, H);
    viewX.drawImage(inkC, 0, 0, W, H);
    viewX.globalCompositeOperation = "destination-in";
    viewX.drawImage(maskC, 0, 0, W, H);
    viewX.globalCompositeOperation = "source-over";
  }

  const proxy = { p: 0 };
  return gsap.to(proxy, {
    p: 1,
    duration: total / PEN_SPEED,
    ease: "none",
    onUpdate: () => render(proxy.p),
    onComplete: () => render(1),
  });
}
