import { fetchConfig, injectConfig } from "./config.js";

export function initCardExport() {
  const btn = document.getElementById("share-btn");
  if (!btn) return;

  // Scale the fixed 1080×1080 card down to fit the viewport (so it isn't cut
  // off on phones). The card stays full-size for the html2canvas export.
  function scaleCard() {
    const canvas = document.querySelector(".card-canvas");
    if (!canvas) return;
    const fit = Math.min(
      (window.innerWidth - 32) / 1080,
      (window.innerHeight - 120) / 1080,
    );
    const s = Math.min(fit, 1);
    canvas.style.transform = `scale(${s})`;
    // transform: scale doesn't shrink the layout box, so the element still
    // reserves 1080×1080 — collapse the leftover footprint (origin is top
    // center) so the card stays centered instead of overflowing the viewport.
    canvas.style.marginBottom = `${-1080 * (1 - s)}px`;
  }
  window.addEventListener("resize", scaleCard);
  scaleCard();

  btn.addEventListener("click", async () => {
    btn.textContent = "กำลังสร้างภาพ…";
    btn.disabled = true;

    const reset = () => {
      btn.textContent = "บันทึก / แชร์การ์ด";
      btn.disabled = false;
    };

    try {
      const canvas = document.querySelector(".card-canvas");
      // Render at native 1080px (not the scaled-down preview) for a crisp export
      const c = await html2canvas(canvas, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      c.toBlob(async (blob) => {
        if (!blob) {
          reset();
          return;
        }
        const file = new File([blob], "nont-may-wedding.png", {
          type: "image/png",
        });
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "นนท์ & เมย์ — Wedding Invitation",
            });
          } else {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "nont-may-wedding.png";
            a.click();
            URL.revokeObjectURL(a.href);
          }
        } catch (_) {
          // User cancelled the share sheet — not an error
        }
        reset();
      }, "image/png");
    } catch (err) {
      console.error(err);
      reset();
    }
  });
}

// Pull live couple/date from config so the card matches the rest of the site
// (the hardcoded HTML is only a fallback when the backend is unreachable).
async function applyCardConfig() {
  const cfg = await fetchConfig();
  injectConfig(cfg); // fills [data-config] (.card-date) + sets window.__weddingConfig
  const c = window.__weddingConfig;
  const names = document.querySelector(".card-names");
  if (names && c?.groom_name && c?.bride_name) {
    names.innerHTML = `${c.groom_name}<span class="ampersand">&amp;</span>${c.bride_name}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initCardExport();
  applyCardConfig();
});
