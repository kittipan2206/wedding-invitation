const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

const PREVIEW_LIMIT = 6; // photos shown on index.html

let allPhotos = [];
let filteredPhotos = [];
let currentLightboxIndex = 0;
let lightboxOpen = false;

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
      (item) => item && typeof item.url === "string" && item.url.startsWith("http")
    );
  } catch {
    return [];
  }
}

// ── Render masonry grid ───────────────────────────────────────────────────────

function renderGrid(photos, containerId, clickCallback) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  if (photos.length === 0) {
    grid.innerHTML = '<p class="gallery-status">ยังไม่มีรูปภาพในหมวดนี้</p>';
    return;
  }

  grid.innerHTML = "";
  photos.forEach((photo, i) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    item.dataset.index = i;

    const img = document.createElement("img");
    img.src = getSizedUrl(photo.url, 800);
    img.alt = photo.caption || "";
    img.loading = "lazy";
    img.classList.add("loading");
    img.addEventListener("load", () => img.classList.remove("loading"));
    img.addEventListener("error", () => {
      img.src = "";
      img.style.minHeight = "120px";
      img.style.background = "rgba(201,184,232,0.15)";
    });

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
    grid.appendChild(item);
  });
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

function updateLightboxContent() {
  const photo = filteredPhotos[currentLightboxIndex];
  if (!photo) return;

  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");
  const counter = document.getElementById("lightbox-counter");

  if (img) {
    img.src = getSizedUrl(photo.url, 1600);
    img.alt = photo.caption || "";
  }
  if (caption) caption.textContent = photo.caption || "";
  if (counter)
    counter.textContent = `${currentLightboxIndex + 1} / ${filteredPhotos.length}`;

  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  if (prevBtn) prevBtn.disabled = currentLightboxIndex === 0;
  if (nextBtn)
    nextBtn.disabled = currentLightboxIndex === filteredPhotos.length - 1;
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

export async function initGallery() {
  initLightbox();
  setupFilters();

  const grid = document.getElementById("gallery-grid");
  if (grid) grid.innerHTML = '<p class="gallery-status">กำลังโหลดรูปภาพ…</p>';

  allPhotos = await fetchPhotos();
  filteredPhotos = [...allPhotos];
  renderGrid(filteredPhotos, "gallery-grid", openLightbox);
}

// ── Preview section (index.html) ──────────────────────────────────────────────

export async function initGalleryPreview() {
  const grid = document.getElementById("gallery-preview-grid");
  const viewAllBtn = document.getElementById("gallery-view-all");
  if (!grid) return;

  const photos = await fetchPhotos();
  const preview = photos.slice(0, PREVIEW_LIMIT);

  if (preview.length === 0) {
    // Keep the existing placeholders
    return;
  }

  // Replace placeholders with real photos
  allPhotos = preview;
  filteredPhotos = preview;
  initLightbox();
  renderGrid(preview, "gallery-preview-grid", openLightbox);

  if (viewAllBtn && photos.length > PREVIEW_LIMIT) {
    viewAllBtn.style.display = "inline-flex";
    viewAllBtn.textContent = `ดูทั้งหมด ${photos.length} รูป →`;
  } else if (viewAllBtn && photos.length > 0) {
    viewAllBtn.style.display = "inline-flex";
  }
}

// ── Entry point: auto-detect which page ───────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("gallery-grid")) {
    initGallery();
  }
});
