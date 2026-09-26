// Finale: the page closes the way it opened. The last screen is a letter
// sheet; scrolling folds it in thirds and slides it into the same 3D
// envelope as the opening, the flap shuts, the wax seal presses. Scrolling
// back up cracks the seal and unfolds it again. Three snap stops: the
// sheet, folded over the open envelope, sealed.
//
// Without WebGL (or with reduced motion / E2E) the CSS envelope bookend in
// footer-env.js plays instead.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CONFIG_DEFAULTS } from "./config.js";
import { initFooterEnvelope } from "./footer-env.js";
import { INK_PEN } from "./letter.js";
import { canvasURL, foilMonogram, letterPaper } from "./paper.js";
import { fontsReady, want3D } from "./platform.js";
import { playFlap, playSlide, preloadSfx } from "./sfx.js";

const SERIF = `"Cormorant Garamond", "Trirong", serif`;
const SANS = `"DM Sans", "IBM Plex Sans Thai Looped", sans-serif`;
const SCRIPT = `"Charm", "Trirong", serif`;

// The sheet as one canvas — shown by the DOM sheet AND used as the WebGL
// texture, so the hand-over between them is pixel-identical. Content sits
// clear of the fold lines at 1/3 and 2/3.
export async function drawFinaleLetter(sheetEl) {
  const w = Math.round(sheetEl.offsetWidth);
  const h = Math.round(sheetEl.offsetHeight);
  const cfg = { ...CONFIG_DEFAULTS, ...window.__weddingConfig };
  const couple = `${cfg.groom_name} & ${cfg.bride_name}`;
  const note = sheetEl.querySelector(".finale-note")?.textContent.trim() || "";
  const date = document.getElementById("footer-date")?.textContent.trim() || "";
  const crest = sheetEl.querySelector(".monogram-crest-letters")?.textContent || "";
  await fontsReady();
  await Promise.all(
    [`italic 400 30px ${SERIF}`, `italic 300 22px ${SERIF}`, `400 19px ${SCRIPT}`, `400 11px ${SANS}`].map(
      (f) => document.fonts.load(f, `${couple}${note}${crest}With love`),
    ),
  ).catch(() => {});

  const c = document.createElement("canvas");
  c.width = w * 2;
  c.height = h * 2;
  const ctx = c.getContext("2d");
  ctx.scale(2, 2);
  ctx.drawImage(letterPaper(w, h).face, 0, 0, w, h);
  ctx.textAlign = "center";

  // blind emboss: light edge up-left, shadow down-right, paper on top
  const PAPER = "#fffdf9";
  const emboss = (draw) => {
    [
      [-0.8, -0.8, "rgba(255,255,255,0.95)"],
      [0.9, 1.1, "rgba(90,60,60,0.2)"],
      [0, 0, PAPER],
    ].forEach(([dx, dy, col]) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.fillStyle = ctx.strokeStyle = col;
      draw();
      ctx.restore();
    });
  };
  const cy = h * 0.17;
  emboss(() => {
    ctx.lineWidth = 1.1;
    [40, 33].forEach((r) => {
      ctx.beginPath();
      ctx.arc(w / 2, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.font = `italic 400 30px ${SERIF}`;
    ctx.fillText(crest, w / 2, cy + 10);
  });

  ctx.fillStyle = INK_PEN;
  ctx.font = `400 19px ${SCRIPT}`;
  ctx.fillText(note, w / 2, h * 0.4, w - 44);
  ctx.fillStyle = "#2e2a28";
  ctx.font = `italic 300 22px ${SERIF}`;
  ctx.fillText("With love,", w / 2, h * 0.505);
  foilMonogram(ctx, w, couple, 30, h * 0.6);
  ctx.fillStyle = "rgba(138,127,122,0.75)";
  ctx.font = `400 11px ${SANS}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(date, w / 2, h * 0.78);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#9a5c74";
  ctx.font = `400 14px ${SANS}`;
  ctx.fillText("♡", w / 2, h * 0.88);
  return c;
}

export function initFinale() {
  const section = document.getElementById("finale");
  const stage = section?.querySelector(".finale-stage");
  const sheetEl = document.getElementById("finale-letter");
  const anchor = document.getElementById("footer-env");
  const scroller = document.querySelector(".snap-wrap");
  if (!section || !stage || !sheetEl || !anchor || !scroller) return;

  if (!want3D()) {
    initFooterEnvelope(); // CSS bookend
    return;
  }
  const bookend = initFooterEnvelope({ animate: false });
  section.classList.add("finale--3d");

  let scene = null;
  let loading = null;
  let progress = 0;
  const fallBack = () => {
    section.classList.remove("finale--3d", "finale--sealed");
    initFooterEnvelope();
  };
  const load = () =>
    (loading ??= (async () => {
      try {
        preloadSfx();
        const { createEnvelopeScene } = await import("./envelope3d.js");
        await fontsReady();
        const drawn = await drawFinaleLetter(sheetEl);
        const url = await canvasURL(drawn);
        if (url) {
          sheetEl.style.backgroundImage = `url("${url}")`;
          sheetEl.classList.add("finale-letter--drawn");
        }
        scene = await createEnvelopeScene(stage, {
          anchor,
          closing: {
            sheetEl,
            sheetCanvas: drawn,
            onStamped: () => {
              section.classList.add("finale--sealed");
              bookend.write();
            },
          },
        });
        if (!scene) return fallBack();
        scene.setProgress(progress);
      } catch {
        fallBack();
      }
    })());
  // build it a couple of screens early — ready before the guest arrives
  new IntersectionObserver(
    ([e]) => e.isIntersecting && load(),
    { root: scroller, rootMargin: "200% 0px" },
  ).observe(section);

  // past the runway the stage scrolls away with the page — keep the 3D
  // envelope glued to its anchor
  scroller.addEventListener("scroll", () => scene?.redraw(), { passive: true });

  gsap.registerPlugin(ScrollTrigger);
  // Scroll picks the STOP, time plays the step. Mandatory snap moves a whole
  // screen in ~0.4 s — scrubbing straight to it squeezed the fold into a
  // blink. Each step instead plays at its own pace (~2.5 s per half), and a
  // change of heart mid-step turns it around smoothly from where it is.
  const STOPS = [0, 0.5, 1];
  const SECONDS_PER_HALF = 2.5;
  const anim = { p: 0 };
  let stop = 0;
  const onFrame = () => {
    const p = anim.p;
    // paper sounds on the way in only
    if (progress < 0.55 && p >= 0.55) playSlide();
    if (progress < 0.72 && p >= 0.72) playFlap();
    if (p < 0.86) section.classList.remove("finale--sealed");
    progress = p;
    scene?.setProgress(p);
  };
  ScrollTrigger.create({
    trigger: section,
    scroller,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      // head for the stop the scroll is moving toward (a nudge of 8% past
      // the current stop commits to the next one; snap finishes the scroll)
      const r = self.progress;
      let next = stop;
      while (next < STOPS.length - 1 && r > STOPS[next] + 0.08) next++;
      while (next > 0 && r < STOPS[next] - 0.08) next--;
      if (next === stop) return;
      stop = next;
      const to = STOPS[stop];
      gsap.to(anim, {
        p: to,
        duration: (Math.abs(to - anim.p) / 0.5) * SECONDS_PER_HALF,
        ease: "power1.inOut",
        overwrite: true,
        onUpdate: onFrame,
      });
    },
  });
}
