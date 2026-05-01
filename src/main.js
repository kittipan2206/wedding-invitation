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
import { initGalleryPreview } from "./js/gallery.js";
import { fetchConfig, injectConfig } from "./js/config.js";

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
    document.title = `${guestName} — นนท์ & เมย์ Wedding Invitation`;
  }

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
  initGalleryPreview();

  // If ?goto=<sectionId> is in the URL, skip envelope and scroll directly to section
  const gotoSection = params.get("goto");
  if (gotoSection) {
    const target = document.getElementById(gotoSection);
    const overlay = document.getElementById("envelope-overlay");
    if (overlay) overlay.style.display = "none";
    afterEnvelope();
    if (target) {
      // Small delay lets fonts/layout settle before scrolling
      setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  } else {
    initEnvelope(afterEnvelope);
  }
});
