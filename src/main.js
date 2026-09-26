import "./styles/main.css";
import { initEnvelope } from "./js/envelope.js";
import { initPetals } from "./js/petals.js";
import { initCountdown } from "./js/countdown.js";
import { initReveal } from "./js/reveal.js";
import { initRsvp } from "./js/rsvp.js";
import { initMusic } from "./js/music.js";
import { initScrollNav } from "./js/scroll-nav.js";
import { initShare } from "./js/share.js";
import { initCursorSparkle } from "./js/cursor-sparkle.js";
import { initFullscreen } from "./js/fullscreen.js";
import { initTypewriter } from "./js/typewriter.js";
import { initGuestbook } from "./js/guestbook.js";
import { initParallax } from "./js/parallax.js";
import { initScrollFX } from "./js/scroll-fx.js";
import { initGalleryPreview } from "./js/gallery.js";
import { fetchConfig, injectConfig } from "./js/config.js";
import { applyMemoryMode } from "./js/memory-mode.js";
import { initHearts } from "./js/hearts.js";
import { initIcsButton } from "./js/ics.js";
import { initSmartCalendar } from "./js/smart-calendar.js";
import { initPetalNames, assembleNames } from "./js/petal-names.js";
import { applyPaperVars } from "./js/paper.js";
import { salutation } from "./js/letter.js";

const THREE_D_BUDGET_MS = 4000; // past this, the classic CSS envelope plays

function want3D() {
  // E2E runners drive the classic envelope; a dedicated test opts into 3D
  if (window.__ENVELOPE_MODE) return window.__ENVELOPE_MODE === "3d";
  if (navigator.webdriver) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

function afterEnvelope() {
  initPetals();
  const musicBtn = document.getElementById("music-btn");
  if (musicBtn) musicBtn.style.display = "flex";
  initTypewriter(".hero-date", { startDelay: 400, charDelay: 55 });
}

document.addEventListener("DOMContentLoaded", async () => {
  const t0 = performance.now();
  applyPaperVars(); // cotton stock for the page's paper surfaces
  const params = new URLSearchParams(window.location.search);
  // If ?goto=<sectionId> is in the URL, OR the envelope was already opened
  // this session, skip the envelope animation entirely. Session-scoped on
  // purpose: the envelope IS the invitation experience — a guest who comes
  // back days later should get it again.
  const gotoSection = params.get("goto");
  const alreadyOpened = sessionStorage.getItem("envelope_opened") === "1";
  const playEnvelope = !gotoSection && !alreadyOpened;
  // Download the 3D envelope while the loader waits on config — free time
  const scene3d = playEnvelope && want3D() ? import("./js/envelope3d.js") : null;

  // Fetch remote config first — injects dynamic content, sets window.__weddingConfig
  // Falls back to defaults silently if GAS is unreachable
  const cfg = await fetchConfig();
  injectConfig(cfg);

  const hideLoader = () =>
    document.fonts.ready.then(() => {
      const loader = document.getElementById("page-loader");
      if (loader) loader.classList.add("loader--hidden");
    });

  const guestName = params.get("to");
  if (guestName) {
    const greet = document.querySelector(".guest-greeting");
    const nameEl = document.querySelector(".guest-name");
    if (greet && nameEl) {
      nameEl.textContent = guestName;
      greet.style.display = "block";
    }
    // Address the envelope front to the guest — first thing they see
    // (handwritten "ถึง คุณ…", same rule as the letter and link previews)
    const envTo = document.querySelector(".env-to");
    if (envTo) {
      envTo.textContent = salutation(guestName);
      envTo.style.display = "block";
    }
    document.title = `${guestName} — นนท์ & เมย์ Wedding Invitation`;
  }

  // After the wedding day, the site flips to a keepsake-album layout — only
  // on real (network/cached) config: hardcoded defaults can't prove the
  // wedding has passed, and a wrong flip hides RSVP from invited guests
  if (cfg) applyMemoryMode(window.__weddingConfig);

  initCountdown();
  initReveal();
  initRsvp();
  initScrollNav();
  initShare();
  initMusic();
  initCursorSparkle();
  initFullscreen();
  initGuestbook();
  initParallax();
  initScrollFX();
  initGalleryPreview();
  initHearts();
  initIcsButton();
  initSmartCalendar();
  initPetalNames();

  // Footer "เปิดซองอีกครั้ง" — clears the session flag and reloads from the
  // top (keeps ?to= personalization, drops ?goto= so the envelope plays)
  const replayBtn = document.getElementById("replay-envelope-btn");
  replayBtn?.addEventListener("click", () => {
    sessionStorage.removeItem("envelope_opened");
    const u = new URL(window.location.href);
    u.searchParams.delete("goto");
    u.hash = "";
    window.location.href = u.toString();
  });

  if (!playEnvelope) {
    hideLoader();
    const overlay = document.getElementById("envelope-overlay");
    if (overlay) overlay.style.display = "none";
    afterEnvelope();
    if (gotoSection) {
      const target = document.getElementById(gotoSection);
      const wrap = document.querySelector(".snap-wrap");
      if (target && wrap) {
        // Wait for fonts to load and ScrollTrigger to refresh, then scroll
        document.fonts.ready.then(() => {
          setTimeout(
            () => wrap.scrollTo({ top: target.offsetTop, behavior: "auto" }),
            350,
          );
        });
      }
    }
  } else {
    // Keep the loader up until the 3D scene is ready (or its budget runs
    // out) so the guest never sees the CSS envelope swap into 3D
    let scene = null;
    if (scene3d) {
      const overlay = document.getElementById("envelope-overlay");
      const pending = scene3d
        .then((m) => m.createEnvelopeScene(overlay))
        .catch(() => null);
      const left = Math.max(0, THREE_D_BUDGET_MS - (performance.now() - t0));
      scene = await Promise.race([
        pending,
        new Promise((r) => setTimeout(() => r(null), left)),
      ]);
      // lost the race — a late scene must not paint over the CSS envelope
      if (!scene) pending.then((late) => late?.dispose());
    }
    hideLoader();
    initEnvelope(
      () => {
        // The personal letter is part of the envelope sequence itself —
        // by the time this fires the guest has read and closed it
        sessionStorage.setItem("envelope_opened", "1");
        afterEnvelope();
      },
      { scene, onClosing: (o) => assembleNames(o) },
    );
  }
});
