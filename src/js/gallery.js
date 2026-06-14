import { setHeroPhoto } from "./hero-photo.js";
import "photoswipe/style.css";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

const PREVIEW_LIMIT = 6; // photos shown on index.html

let allPhotos = [];
let filteredPhotos = [];

// Cache of ALL photos fetched by initGalleryPreview (reused by overlay)
let cachedPhotos = [];

// Overlay state
let overlayFiltered = [];
let _previewWired = false; // prevent duplicate event listeners on re-init
let _overlayKeysWired = false; // prevent duplicate overlay Escape listener

// ── URL helper ────────────────────────────────────────────────────────────────

export function getSizedUrl(url, size) {
  if (!url) return "";
  // Strip any existing sizing params (=w... including -h...-s-no-gm and ?authuser=N)
  if (url.includes("googleusercontent.com")) {
    const base = url.replace(/=w[^?#]+(?:[?#].*)?$/, "");
    return `${base}=w${size}`;
  }
  return url;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchPhotos() {
  try {
    const res = await fetch(`${SHEET_URL}?type=photos`, {
      method: "GET",
      redirect: "follow",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    // Guard: only accept items that look like photo records (must have a url field)
    return data.filter(
      (item) =>
        item && typeof item.url === "string" && item.url.startsWith("http"),
    );
  } catch {
    return [];
  }
}

// ── Render masonry grid ───────────────────────────────────────────────────────

// ── Lazy load via IntersectionObserver ───────────────────────────────────────
// Using data-src instead of src directly prevents iOS from decoding all images
// at once, which can exhaust tab memory and crash the page.

// Load images when they approach the viewport (+300px margin)
const _imgObserver =
  typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const img = entry.target;
            if (entry.isIntersecting) {
              // Image entering viewport — load it
              if (img.dataset.src) {
                img.src = img.dataset.src;
                delete img.dataset.src;
              }
            } else {
              // Image far outside viewport — release decoded bitmap from RAM
              releaseImg(img);
            }
          });
        },
        // rootMargin in % = relative to viewport height (auto-scales across all screen sizes)
        // 150% top = preload 1.5× viewport height ahead; 200% bottom = unload 2× vh after exit
        { rootMargin: "150% 0px 200% 0px" },
      )
    : null;

// Unload image bitmap from RAM while preserving layout space via aspect-ratio
function releaseImg(img) {
  if (!img.src || !img.complete) return;
  // aspect-ratio is already set on img when it loaded — no extra height work needed
  img.dataset.src = img.src;
  img.src = "";
}

function getColCount(containerId) {
  if (containerId === "gallery-preview-grid") return 2;
  if (window.innerWidth <= 420) return 1;
  if (window.innerWidth <= 700) return 2;
  return 3;
}

function renderGrid(photos, containerId, clickCallback) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  // Free memory from previously loaded images before re-rendering
  grid.querySelectorAll("img").forEach((img) => {
    _imgObserver?.unobserve(img);
    img.src = "";
  });

  if (photos.length === 0) {
    grid.innerHTML = '<p class="gallery-status">ยังไม่มีรูปภาพในหมวดนี้</p>';
    return;
  }

  // Build flex column wrappers — distribute left-to-right so reading order is
  // row-by-row (1,2,3 / 4,5,6) instead of CSS columns top-down (1,4,7 / 2,5,8)
  const colCount = getColCount(containerId);
  const cols = Array.from({ length: colCount }, () => {
    const col = document.createElement("div");
    col.className = "gallery-col";
    return col;
  });

  photos.forEach((photo, i) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    item.dataset.index = i;

    const img = document.createElement("img");
    const sizedUrl = getSizedUrl(photo.url, 800);
    img.alt = photo.caption || "";
    img.classList.add("loading");

    // LQIP: a tiny 32px thumbnail (blurred by upscale) sits behind the image so
    // there's a soft preview instead of a blank box while the full one loads or
    // after its bitmap is released from RAM. Only Google-hosted URLs can be
    // resized this cheaply; others fall back to the plain loading state.
    if (photo.url.includes("googleusercontent.com")) {
      item.classList.add("lqip");
      item.style.backgroundImage = `url("${getSizedUrl(photo.url, 32)}")`;
    }

    img.addEventListener("load", () => {
      img.classList.remove("loading");
      // Store aspect-ratio so layout is preserved when src is cleared (no layout shift)
      if (img.naturalWidth && img.naturalHeight) {
        img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
        // Capture real dimensions for PhotoSwipe's zoom math
        photo._w = img.naturalWidth;
        photo._h = img.naturalHeight;
      }
    });
    img.addEventListener("error", () => {
      img.src = "";
      img.style.minHeight = "120px";
      img.style.background = "rgba(201,184,232,0.15)";
    });

    if (_imgObserver) {
      img.dataset.src = sizedUrl;
      _imgObserver.observe(img);
    } else {
      img.src = sizedUrl;
    }

    const overlay = document.createElement("div");
    overlay.className = "gallery-item-overlay";
    if (photo.caption) {
      const cap = document.createElement("p");
      cap.className = "gallery-item-caption";
      cap.textContent = photo.caption;
      overlay.appendChild(cap);
    }

    item.appendChild(img);
    item.appendChild(overlay);
    item.addEventListener("click", () => clickCallback(i));

    // Assign to column left-to-right: photo 0→col0, 1→col1, 2→col2, 3→col0...
    cols[i % colCount].appendChild(item);
  });

  grid.innerHTML = "";
  cols.forEach((col) => grid.appendChild(col));
}

// ── Filter ────────────────────────────────────────────────────────────────────

function applyFilter(category) {
  filteredPhotos =
    category === "all"
      ? [...allPhotos]
      : allPhotos.filter((p) => p.category === category);
  renderGrid(filteredPhotos, "gallery-grid", openLightbox);
}

function setupFilters() {
  const tabs = document.querySelectorAll("[data-filter]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("filter--active"));
      tab.classList.add("filter--active");
      applyFilter(tab.dataset.filter);
    });
  });
}

// ── Lightbox (PhotoSwipe) ─────────────────────────────────────────────────────
// PhotoSwipe powers the viewer for both the gallery page and the overlay,
// adding pinch/double-tap zoom, drag-to-close, momentum swipe and a built-in
// counter the old hand-rolled lightbox lacked. We open it programmatically with
// the PhotoSwipe core (not the Lightbox wrapper, which assumes a DOM thumbnail
// to zoom from) and a dynamic dataSource. The core module is code-split, so it
// only loads on the first open.
//
// Remote images have no intrinsic dimensions, so each slide declares a fixed
// 1600-wide canvas using the aspect captured from the grid thumbnail (falling
// back to 3:2). msrc is the already-cached thumbnail, shown instantly while the
// full image loads.

let _pswpOpen = false;
let activePswp = null;
let _overlayOpen = false;

async function openPhotoSwipe(photos, index) {
  if (!Array.isArray(photos) || photos.length === 0) return;

  const dataSource = photos.map((p) => {
    const aspect = p._w && p._h ? p._w / p._h : 1600 / 1067;
    const width = 1600;
    return {
      src: getSizedUrl(p.url, 1600),
      msrc: getSizedUrl(p.url, 800),
      width,
      height: Math.round(width / aspect),
      alt: p.caption || "",
    };
  });

  const { default: PhotoSwipe } = await import("photoswipe");
  const pswp = new PhotoSwipe({
    dataSource,
    index,
    bgOpacity: 0.94,
    showHideAnimationType: "none",
    wheelToZoom: true,
    padding: { top: 24, bottom: 24, left: 12, right: 12 },
  });

  // Caption pinned below the image — mirrors the admin-written captions
  pswp.on("uiRegister", () => {
    pswp.ui.registerElement({
      name: "caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      onInit: (el) => {
        el.className = "pswp__custom-caption";
        const sync = () => {
          const text = pswp.currSlide?.data?.alt || "";
          el.textContent = text;
          el.style.display = text ? "block" : "none";
        };
        pswp.on("change", sync);
        sync();
      },
    });
  });

  pswp.on("destroy", () => {
    _pswpOpen = false;
    activePswp = null;
    if (typeof window !== "undefined" && window.history && history.state?.pswpOpen) {
      history.back();
    }
  });

  if (typeof window !== "undefined" && window.history) {
    history.pushState({ pswpOpen: true }, "");
  }
  activePswp = pswp;

  pswp.init();
  _pswpOpen = true;
}

// Gallery page entry point (keeps the old name so renderGrid callbacks are unchanged)
function openLightbox(index) {
  openPhotoSwipe(filteredPhotos, index);
}

// ── Full gallery page (gallery.html) ─────────────────────────────────────────

function hideLoader() {
  const loader = document.getElementById("page-loader");
  if (loader) loader.classList.add("loader--hidden");
}

function revealPage() {
  const page = document.querySelector(".gallery-page");
  if (page) page.classList.add("is-ready");
}

export async function initGallery() {
  setupFilters();

  // Wait for fonts before fetching so there's no reflow flash
  const [photos] = await Promise.all([fetchPhotos(), document.fonts.ready]);
  allPhotos = photos;
  filteredPhotos = [...allPhotos];
  renderGrid(filteredPhotos, "gallery-grid", openLightbox);

  // Reveal page then fade out loader
  revealPage();
  setTimeout(hideLoader, 80);
}

// ── Gallery overlay (index.html → opens in-place, no page navigation) ─────────

function openOverlay() {
  const el = document.getElementById("gallery-overlay");
  if (!el) return;
  el.classList.add("overlay--open");
  el.setAttribute("aria-hidden", "false");
  _overlayOpen = true;

  if (typeof window !== "undefined" && window.history) {
    history.pushState({ overlayOpen: true }, "");
  }

  // Lazy-init: render grid on first open
  if (!el.dataset.initialized) {
    el.dataset.initialized = "1";
    overlayFiltered = [...cachedPhotos];
    renderGrid(overlayFiltered, "overlay-gallery-grid", openOverlayLightbox);
    setupOverlayFilters();
    wireOverlayKeys();
  }
}

function closeOverlay() {
  const el = document.getElementById("gallery-overlay");
  if (!el) return;
  el.classList.remove("overlay--open");
  el.setAttribute("aria-hidden", "true");
  _overlayOpen = false;

  if (typeof window !== "undefined" && window.history && history.state?.overlayOpen) {
    history.back();
  }

  // Release all decoded bitmaps from RAM when overlay closes
  // Observer is still attached — images will reload when overlay opens again
  document.querySelectorAll("#overlay-gallery-grid img").forEach((img) => {
    releaseImg(img);
  });
  // Reset initialized flag so grid re-renders fresh on next open
  if (el.dataset.initialized) delete el.dataset.initialized;
}

function applyOverlayFilter(category) {
  overlayFiltered =
    category === "all"
      ? [...cachedPhotos]
      : cachedPhotos.filter((p) => p.category === category);
  renderGrid(overlayFiltered, "overlay-gallery-grid", openOverlayLightbox);
}

function setupOverlayFilters() {
  document.querySelectorAll("[data-overlay-filter]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll("[data-overlay-filter]")
        .forEach((t) => t.classList.remove("overlay-filter--active"));
      tab.classList.add("overlay-filter--active");
      applyOverlayFilter(tab.dataset.overlayFilter);
    });
  });
}

// Overlay entry point — opens the shared PhotoSwipe over the overlay grid
function openOverlayLightbox(index) {
  openPhotoSwipe(overlayFiltered, index);
}

// Escape closes the overlay grid (PhotoSwipe handles its own Escape while open)
function wireOverlayKeys() {
  if (_overlayKeysWired) return;
  _overlayKeysWired = true;
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (_pswpOpen) return; // lightbox open → let PhotoSwipe handle it
    const ov = document.getElementById("gallery-overlay");
    if (ov?.classList.contains("overlay--open")) closeOverlay();
  });
}

// ── Polaroid strip (index.html preview) ───────────────────────────────────────
// Horizontal film-strip of polaroid cards with the captions admins already
// write ("คนสวยที่สุดดด" etc.) — the grid hid them behind hover overlays.

function renderPolaroidStrip(photos, containerId, clickCallback) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  grid.querySelectorAll("img").forEach((img) => {
    _imgObserver?.unobserve(img);
    img.src = "";
  });

  grid.classList.add("polaroid-strip");
  grid.innerHTML = "";

  photos.forEach((photo, i) => {
    const item = document.createElement("div");
    item.className = "gallery-item polaroid";
    item.dataset.index = i;

    const img = document.createElement("img");
    img.alt = photo.caption || "";
    img.classList.add("loading");
    // LQIP: tiny blurred thumbnail behind the polaroid image while it loads
    if (photo.url.includes("googleusercontent.com")) {
      img.classList.add("lqip");
      img.style.backgroundImage = `url("${getSizedUrl(photo.url, 32)}")`;
    }
    img.addEventListener("load", () => {
      img.classList.remove("loading");
      if (img.naturalWidth && img.naturalHeight) {
        photo._w = img.naturalWidth;
        photo._h = img.naturalHeight;
      }
    });
    img.addEventListener("error", () => {
      img.src = "";
    });

    const sizedUrl = getSizedUrl(photo.url, 600);
    if (_imgObserver) {
      img.dataset.src = sizedUrl;
      _imgObserver.observe(img);
    } else {
      img.src = sizedUrl;
    }

    const cap = document.createElement("p");
    cap.className = "polaroid-caption";
    cap.textContent = photo.caption || "♡";

    item.appendChild(img);
    item.appendChild(cap);
    item.addEventListener("click", () => clickCallback(i));
    grid.appendChild(item);
  });
}

// ── Preview section (index.html) ──────────────────────────────────────────────

export async function initGalleryPreview() {
  const grid = document.getElementById("gallery-preview-grid");
  const viewAllBtn = document.getElementById("gallery-view-all");
  if (!grid) return;

  const photos = await fetchPhotos();
  cachedPhotos = photos; // store ALL photos for overlay use
  setHeroPhoto(photos);
  const preview = photos.slice(0, PREVIEW_LIMIT);

  // Footer note must match what's on screen: placeholders → "photos coming",
  // real photos pre-event → "wedding-day photos coming", post-event → hidden
  const note = document.querySelector(".gallery-note");
  if (note && preview.length > 0) {
    const iso = window.__weddingConfig?.event_date_iso;
    const postEvent =
      /^\d{4}-\d{2}-\d{2}$/.test(iso || "") &&
      new Date() > new Date(`${iso}T23:59:59+07:00`);
    if (postEvent) {
      note.style.display = "none";
    } else {
      note.textContent = "รูปจากวันงานจะเพิ่มเข้ามาหลังวันงาน ♡";
    }
  }

  if (preview.length === 0) {
    // Keep the existing placeholders
    return;
  }

  // Replace placeholders with real photos
  // Clicking a preview item opens the overlay (all photos) and jumps to that photo
  renderPolaroidStrip(preview, "gallery-preview-grid", (previewIndex) => {
    const clickedUrl = preview[previewIndex]?.url;
    openOverlay(); // lazy-inits overlay grid on first open
    const fullIndex = cachedPhotos.findIndex((p) => p.url === clickedUrl);
    openOverlayLightbox(fullIndex >= 0 ? fullIndex : previewIndex);
  });

  if (viewAllBtn && photos.length > 0) {
    viewAllBtn.style.display = "inline-flex";
    if (photos.length > PREVIEW_LIMIT) {
      viewAllBtn.textContent = `ดูทั้งหมด ${photos.length} รูป →`;
    }
  }

  // Wire buttons only once — guard against duplicate calls (e.g. pageshow)
  if (!_previewWired) {
    _previewWired = true;
    viewAllBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openOverlay();
    });
    document
      .getElementById("gallery-overlay-close")
      ?.addEventListener("click", closeOverlay);
  }
}

// ── Entry point: auto-detect which page ───────────────────────────────────────

if (typeof window !== "undefined" && window.history) {
  // Clear any stale state on reload
  if (history.state?.pswpOpen || history.state?.overlayOpen) {
    history.replaceState(null, "");
  }

  window.addEventListener("popstate", (e) => {
    const state = e.state || {};

    if (_pswpOpen && !state.pswpOpen && activePswp) {
      activePswp.close();
    }

    if (_overlayOpen && !state.overlayOpen) {
      const el = document.getElementById("gallery-overlay");
      if (el) {
        el.classList.remove("overlay--open");
        el.setAttribute("aria-hidden", "true");
        _overlayOpen = false;

        document.querySelectorAll("#overlay-gallery-grid img").forEach((img) => {
          releaseImg(img);
        });
        if (el.dataset.initialized) delete el.dataset.initialized;
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("gallery-grid")) {
    initGallery();
  }
});
