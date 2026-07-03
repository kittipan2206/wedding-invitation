import { fetchConfig, injectConfig } from "./config.js";
import { qrDataUrl } from "./qr.js";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

// Local version of sizing helper to prevent import circular dependencies
function getSizedUrl(url, size) {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=w[^?#]+(?:[?#].*)?$/, "") + `=w${size}`;
  }
  return url;
}

const BASE_URL = (() => {
  const u = new URL(window.location.href);
  u.pathname = "/"; // points back to index.html
  u.search = "";
  u.hash = "";
  return u.toString().replace(/\/$/, "");
})();

let currentTemplate = "classic";
let currentGuestName = "";
let photoUrl = "";

// Element references
let previewCard = null;
let exportCard = null;

function bootstrapTemplates() {
  const template = document.getElementById("card-template");
  const previewContainer = document.querySelector(".card-preview-container");
  const exportContainer = document.querySelector(".export-container");

  if (!template || !previewContainer || !exportContainer) return;

  // Clear existing content
  previewContainer.innerHTML = "";
  exportContainer.innerHTML = "";

  // Clone into preview and export wrappers
  const previewClone = template.content.cloneNode(true);
  previewContainer.appendChild(previewClone);
  previewCard = previewContainer.querySelector(".card-canvas");

  const exportClone = template.content.cloneNode(true);
  exportContainer.appendChild(exportClone);
  exportCard = exportContainer.querySelector(".card-canvas");

  // Prevent Playwright E2E strict mode violations by renaming target test classes in the export clone
  exportCard.querySelectorAll(".card-names").forEach((el) => {
    el.classList.remove("card-names");
    el.classList.add("card-names-export");
  });
  exportCard.querySelectorAll(".card-date").forEach((el) => {
    el.classList.remove("card-date");
    el.classList.add("card-date-export");
  });
}

// Monotonic token so a slow older QR render can't overwrite a newer one
// while the user is still typing the guest name
let qrRenderToken = 0;

function updateQrCodes(targetUrl) {
  const token = ++qrRenderToken;
  // 512px source → stays crisp inside the 2160px export canvas
  qrDataUrl(targetUrl, 512).then((dataUrl) => {
    if (token !== qrRenderToken) return; // superseded by a newer render
    // Fallback: old external API (cors=true so html2canvas still works)
    const src =
      dataUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(targetUrl)}&cors=true`;
    [previewCard, exportCard].forEach((card) => {
      const qrImage = card?.querySelector(".card-qr-image");
      if (qrImage) qrImage.src = src;
    });
  });
}

function updateCards() {
  if (!previewCard || !exportCard) return;

  const targetUrl = currentGuestName
    ? `${BASE_URL}?to=${encodeURIComponent(currentGuestName)}`
    : BASE_URL;
  updateQrCodes(targetUrl);

  const cards = [previewCard, exportCard];

  cards.forEach((card) => {
    // 1. Update Template Classes
    card.className = `card-canvas theme-${currentTemplate}`;

    // 2. Update Guest Greeting
    const greeting = card.querySelector(".card-invite-greeting");
    const nameEl = card.querySelector(".card-to-name");
    if (greeting && nameEl) {
      if (currentGuestName.trim()) {
        nameEl.textContent = currentGuestName;
        greeting.style.display = "flex";
      } else {
        greeting.style.display = "none";
      }
    }

    // 3. QR code is updated async by updateQrCodes() above

    // 4. Update Background Photo (for Photo template)
    const photoBg = card.querySelector(".card-photo-bg");
    const photoOverlay = card.querySelector(".card-photo-overlay");
    if (photoBg && photoOverlay) {
      if (currentTemplate === "photo" && photoUrl) {
        photoBg.style.backgroundImage = `url("${getSizedUrl(photoUrl, 1200)}")`;
        photoBg.style.display = "block";
        photoOverlay.style.display = "block";
      } else {
        photoBg.style.display = "none";
        photoBg.style.backgroundImage = "none";
        photoOverlay.style.display = "none";
      }
    }
  });

  // Re-run scaling on the preview card container
  scaleCard();
}

function scaleCard() {
  const container = document.querySelector(".card-preview-container");
  if (!container || !previewCard) return;

  // Get the size of the aspect-ratio container
  const w = container.clientWidth;
  if (w <= 0) return;

  const scale = w / 1080;
  previewCard.style.transform = `scale(${scale})`;
}

async function fetchPhotos() {
  try {
    const res = await fetch(`${SHEET_URL}?type=photos`, {
      method: "GET",
      redirect: "follow",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function initCardExport() {
  const saveBtn = document.getElementById("share-btn");
  const nameInput = document.getElementById("card-guest-name");
  const templateBtns = document.querySelectorAll(".btn-template");

  if (!saveBtn) return;

  // Initialize templates
  bootstrapTemplates();

  // Load parameters from URL
  const params = new URLSearchParams(window.location.search);
  const toParam = params.get("to") || "";
  const themeParam = params.get("theme") || params.get("template") || "";
  const forceMode = params.get("mode") || "";

  // Determine if we are in Guest View Mode or Partner Edit Mode
  const isViewMode = forceMode === "view" || (toParam && forceMode !== "edit");

  if (isViewMode) {
    document.body.classList.add("mode-view");
    if (saveBtn) saveBtn.textContent = "ดาวน์โหลดการ์ดนี้";
  }

  // Pre-fill guest name if present
  if (toParam) {
    currentGuestName = toParam;
    if (nameInput) nameInput.value = toParam;
  }

  // Load template style if specified
  if (
    themeParam &&
    ["classic", "floral", "photo"].includes(themeParam.toLowerCase())
  ) {
    currentTemplate = themeParam.toLowerCase();
    templateBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.template === currentTemplate);
    });
  }

  // Handle name input typing
  nameInput?.addEventListener("input", (e) => {
    currentGuestName = e.target.value;
    updateCards();
  });

  // Handle template selection clicks
  templateBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      templateBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTemplate = btn.dataset.template;
      updateCards();
    });
  });

  // Handle window resizing
  window.addEventListener("resize", scaleCard);
  // Force a scale call after styles load
  setTimeout(scaleCard, 100);

  // Handle Export / Save Button click
  saveBtn.addEventListener("click", async () => {
    saveBtn.textContent = "กำลังสร้างภาพ…";
    saveBtn.disabled = true;

    const reset = () => {
      saveBtn.textContent = "บันทึก / แชร์การ์ด";
      saveBtn.disabled = false;
    };

    try {
      // We render the HIDDEN 1080x1080 export card to guarantee crisp, square output
      if (!exportCard) {
        reset();
        return;
      }

      // Wait a moment to ensure any images/QR codes are fully loaded in the hidden canvas
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvasResult = await html2canvas(exportCard, {
        scale: 2, // 2x resolution = 2160x2160px for premium sharpness
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      canvasResult.toBlob(async (blob) => {
        if (!blob) {
          reset();
          return;
        }

        const file = new File([blob], "wedding-invitation-card.png", {
          type: "image/png",
        });

        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "ขอเรียนเชิญร่วมงานแต่งงาน นนท์ & เมย์",
            });
          } else {
            // Direct fallback download
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = currentGuestName
              ? `wedding-card-${currentGuestName.trim()}.png`
              : "wedding-card.png";
            a.click();
            URL.revokeObjectURL(a.href);
          }
        } catch (_) {
          // Sharing cancelled by user — no action needed
        }
        reset();
      }, "image/png");
    } catch (err) {
      console.error("[CardExport] html2canvas error:", err);
      reset();
    }
  });
}

async function applyCardConfig() {
  const cfg = await fetchConfig();
  injectConfig(cfg); // fills date display, sets window.__weddingConfig

  const c = window.__weddingConfig;

  // Inject names on all clones
  const cards = [previewCard, exportCard];
  cards.forEach((card) => {
    if (!card) return;
    const names = card.querySelector(".card-names, .card-names-export");
    if (names && c?.groom_name && c?.bride_name) {
      names.innerHTML = `${c.groom_name}<span class="ampersand">&amp;</span>${c.bride_name}`;
    }
  });

  // Fetch photos to support the Photo Card template background
  const photos = await fetchPhotos();
  if (c?.hero_photo_url) {
    photoUrl = c.hero_photo_url;
  } else if (photos.length > 0) {
    const visible = photos.filter((p) => p.visible !== false && p.url);
    const pre = visible.find((p) => p.category === "pre-wedding");
    photoUrl = (pre || visible[0])?.url || "";
  }

  // Trigger first render with fetched data
  updateCards();
}

document.addEventListener("DOMContentLoaded", () => {
  initCardExport();
  applyCardConfig();
});
