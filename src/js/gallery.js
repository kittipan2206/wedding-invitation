const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

const PREVIEW_LIMIT = 6; // photos shown on index.html

let allPhotos = [];
let filteredPhotos = [];
let currentLightboxIndex = 0;
let lightboxOpen = false;

// Cache of ALL photos fetched by initGalleryPreview (reused by overlay)
let cachedPhotos = [];

// Overlay state (separate from preview lightbox)
let overlayFiltered = [];
let _previewWired = false; // prevent duplicate event listeners on re-init
let _lightboxWired = false; // prevent duplicate lightbox listeners
let _overlayLbWired = false; // prevent duplicate overlay lightbox listeners
let overlayLbIndex = 0;
let overlayLbOpen = false;

// ── URL helper ────────────────────────────────────────────────────────────────

function getSizedUrl(url, size) {
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
    img.addEventListener("load", () => {
      img.classList.remove("loading");
      // Store aspect-ratio so layout is preserved when src is cleared (no layout shift)
      if (img.naturalWidth && img.naturalHeight) {
        img.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
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

// ── Lightbox ──────────────────────────────────────────────────────────────────

function openLightbox(index) {
  currentLightboxIndex = index;
  updateLightboxContent();
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.classList.add("lightbox--open");
  document.body.style.overflow = "hidden";
  lightboxOpen = true;
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.classList.remove("lightbox--open");
  document.body.style.overflow = "";
  lightboxOpen = false;
}

function setLightboxLoading(loading) {
  const lb = document.getElementById("lightbox");
  if (loading) lb?.classList.add("lightbox--loading");
  else lb?.classList.remove("lightbox--loading");
}

function updateLightboxContent() {
  const photo = filteredPhotos[currentLightboxIndex];
  if (!photo) return;

  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");
  const counter = document.getElementById("lightbox-counter");

  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  if (prevBtn) prevBtn.disabled = currentLightboxIndex === 0;
  if (nextBtn)
    nextBtn.disabled = currentLightboxIndex === filteredPhotos.length - 1;
  if (caption) caption.textContent = photo.caption || "";
  if (counter)
    counter.textContent = `${currentLightboxIndex + 1} / ${filteredPhotos.length}`;

  if (!img) return;
  const newSrc = getSizedUrl(photo.url, 1600);

  // Preload in memory first, then swap — avoids blank flash
  setLightboxLoading(true);
  img.style.opacity = "0";
  const preload = new Image();
  preload.onload = () => {
    img.src = newSrc;
    img.alt = photo.caption || "";
    img.style.opacity = "1";
    setLightboxLoading(false);
  };
  preload.onerror = () => {
    img.src = newSrc; // show broken-img rather than blank
    img.style.opacity = "1";
    setLightboxLoading(false);
  };
  preload.src = newSrc;
}

function lightboxPrev() {
  if (currentLightboxIndex > 0) {
    currentLightboxIndex--;
    updateLightboxContent();
  }
}

function lightboxNext() {
  if (currentLightboxIndex < filteredPhotos.length - 1) {
    currentLightboxIndex++;
    updateLightboxContent();
  }
}

function initLightbox() {
  if (_lightboxWired) return;
  _lightboxWired = true;

  document
    .getElementById("lightbox-close")
    ?.addEventListener("click", closeLightbox);
  document
    .getElementById("lightbox-prev")
    ?.addEventListener("click", lightboxPrev);
  document
    .getElementById("lightbox-next")
    ?.addEventListener("click", lightboxNext);

  // Click backdrop to close
  document.getElementById("lightbox")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeLightbox();
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (!lightboxOpen) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      lightboxPrev();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      lightboxNext();
    }
  });

  // Touch swipe
  let touchStartX = 0;
  document.getElementById("lightbox")?.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true },
  );
  document.getElementById("lightbox")?.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) lightboxNext();
      else lightboxPrev();
    }
  });
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
  initLightbox();
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

  // Lazy-init: render grid + wire lightbox on first open
  if (!el.dataset.initialized) {
    el.dataset.initialized = "1";
    overlayFiltered = [...cachedPhotos];
    renderGrid(overlayFiltered, "overlay-gallery-grid", openOverlayLightbox);
    setupOverlayFilters();
    initOverlayLightbox();
  }
}

function closeOverlay() {
  const el = document.getElementById("gallery-overlay");
  if (!el) return;
  el.classList.remove("overlay--open");
  el.setAttribute("aria-hidden", "true");
  if (overlayLbOpen) closeOverlayLightbox();

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

function openOverlayLightbox(index) {
  overlayLbIndex = index;
  updateOverlayLbContent();
  document.getElementById("overlay-lightbox")?.classList.add("lightbox--open");
  overlayLbOpen = true;
}

function closeOverlayLightbox() {
  document
    .getElementById("overlay-lightbox")
    ?.classList.remove("lightbox--open");
  overlayLbOpen = false;
}

function setOverlayLbLoading(loading) {
  const lb = document.getElementById("overlay-lightbox");
  if (loading) lb?.classList.add("lightbox--loading");
  else lb?.classList.remove("lightbox--loading");
}

function updateOverlayLbContent() {
  const photo = overlayFiltered[overlayLbIndex];
  if (!photo) return;
  const img = document.getElementById("overlay-lightbox-img");
  const caption = document.getElementById("overlay-lightbox-caption");
  const counter = document.getElementById("overlay-lightbox-counter");
  if (counter)
    counter.textContent = `${overlayLbIndex + 1} / ${overlayFiltered.length}`;
  const prev = document.getElementById("overlay-lightbox-prev");
  const next = document.getElementById("overlay-lightbox-next");
  if (prev) prev.disabled = overlayLbIndex === 0;
  if (next) next.disabled = overlayLbIndex === overlayFiltered.length - 1;

  if (!img) return;
  const newSrc = getSizedUrl(photo.url, 1600);
  setOverlayLbLoading(true);
  img.style.opacity = "0";
  const preload = new Image();
  preload.onload = () => {
    img.src = newSrc;
    img.alt = photo.caption || "";
    img.style.opacity = "1";
    setOverlayLbLoading(false);
  };
  preload.onerror = () => {
    img.src = newSrc;
    img.alt = photo.caption || "";
    img.style.opacity = "1";
    setOverlayLbLoading(false);
  };
  preload.src = newSrc;
}

function initOverlayLightbox() {
  if (_overlayLbWired) return;
  _overlayLbWired = true;

  document
    .getElementById("overlay-lightbox-close")
    ?.addEventListener("click", closeOverlayLightbox);
  document
    .getElementById("overlay-lightbox-prev")
    ?.addEventListener("click", () => {
      if (overlayLbIndex > 0) {
        overlayLbIndex--;
        updateOverlayLbContent();
      }
    });
  document
    .getElementById("overlay-lightbox-next")
    ?.addEventListener("click", () => {
      if (overlayLbIndex < overlayFiltered.length - 1) {
        overlayLbIndex++;
        updateOverlayLbContent();
      }
    });
  document
    .getElementById("overlay-lightbox")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeOverlayLightbox();
    });

  // Keyboard: Escape closes lightbox first, then overlay on next press
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (overlayLbOpen) {
        closeOverlayLightbox();
      } else if (
        document
          .getElementById("gallery-overlay")
          ?.classList.contains("overlay--open")
      ) {
        closeOverlay();
      }
    }
    if (!overlayLbOpen) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (overlayLbIndex > 0) {
        overlayLbIndex--;
        updateOverlayLbContent();
      }
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (overlayLbIndex < overlayFiltered.length - 1) {
        overlayLbIndex++;
        updateOverlayLbContent();
      }
    }
  });

  // Touch swipe
  let tx = 0;
  const lb = document.getElementById("overlay-lightbox");
  lb?.addEventListener(
    "touchstart",
    (e) => {
      tx = e.touches[0].clientX;
    },
    { passive: true },
  );
  lb?.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && overlayLbIndex < overlayFiltered.length - 1) {
        overlayLbIndex++;
        updateOverlayLbContent();
      } else if (dx > 0 && overlayLbIndex > 0) {
        overlayLbIndex--;
        updateOverlayLbContent();
      }
    }
  });
}

// ── Preview section (index.html) ──────────────────────────────────────────────

export async function initGalleryPreview() {
  const grid = document.getElementById("gallery-preview-grid");
  const viewAllBtn = document.getElementById("gallery-view-all");
  if (!grid) return;

  const photos = await fetchPhotos();
  cachedPhotos = photos; // store ALL photos for overlay use
  const preview = photos.slice(0, PREVIEW_LIMIT);

  if (preview.length === 0) {
    // Keep the existing placeholders
    return;
  }

  // Replace placeholders with real photos
  // Clicking a preview item opens the overlay (all photos) and jumps to that photo
  renderGrid(preview, "gallery-preview-grid", (previewIndex) => {
    const clickedUrl = preview[previewIndex]?.url;
    openOverlay(); // lazy-inits overlay grid + initOverlayLightbox if first open
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

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("gallery-grid")) {
    initGallery();
  }
});
