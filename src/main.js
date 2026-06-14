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
import { showLetter } from "./js/letter.js";
import { initHearts } from "./js/hearts.js";

function afterEnvelope() {
  initPetals();
  const musicBtn = document.getElementById("music-btn");
  if (musicBtn) musicBtn.style.display = "flex";
  initTypewriter(".hero-date", { startDelay: 400, charDelay: 55 });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Fetch remote config first — injects dynamic content, sets window.__weddingConfig
  // Falls back to defaults silently if GAS is unreachable
  const cfg = await fetchConfig();
  injectConfig(cfg);

  // Hide loader once fonts are ready
  document.fonts.ready.then(() => {
    const loader = document.getElementById("page-loader");
    if (loader) loader.classList.add("loader--hidden");
  });

  const params = new URLSearchParams(window.location.search);
  const guestName = params.get("to");
  if (guestName) {
    const greet = document.querySelector(".guest-greeting");
    const nameEl = document.querySelector(".guest-name");
    if (greet && nameEl) {
      nameEl.textContent = guestName;
      greet.style.display = "block";
    }
    // Address the envelope front to the guest — first thing they see
    const envTo = document.querySelector(".env-to");
    const envToName = document.querySelector(".env-to-name");
    if (envTo && envToName) {
      envToName.textContent = guestName;
      envTo.style.display = "block";
    }
    document.title = `${guestName} — นนท์ & เมย์ Wedding Invitation`;
  }

  // After the wedding day, the site flips to a keepsake-album layout
  applyMemoryMode(window.__weddingConfig);

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

  // If ?goto=<sectionId> is in the URL, OR the envelope was already opened
  // on a previous visit, skip the envelope animation entirely.
  const gotoSection = params.get("goto");
  const alreadyOpened = localStorage.getItem("envelope_opened") === "1";

  if (gotoSection || alreadyOpened) {
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
    initEnvelope(() => {
      localStorage.setItem("envelope_opened", "1");
      // First visit only: a short personal letter before the invitation
      showLetter(afterEnvelope);
    });
  }
});
