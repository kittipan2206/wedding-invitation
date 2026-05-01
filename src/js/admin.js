const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

// Simple password check — client-side only, suitable for personal wedding admin
const ADMIN_PW = "30122001";
const AUTH_KEY = "gallery_admin_auth";

let photos = [];

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthed() {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

function initAuth() {
  const authScreen = document.getElementById("auth-screen");
  const adminScreen = document.getElementById("admin-screen");

  if (isAuthed()) {
    authScreen.style.display = "none";
    adminScreen.style.display = "block";
    loadPhotos();
    return;
  }

  document.getElementById("auth-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = document.getElementById("admin-password")?.value ?? "";
    if (pw === ADMIN_PW) {
      sessionStorage.setItem(AUTH_KEY, "1");
      authScreen.style.display = "none";
      adminScreen.style.display = "block";
      loadPhotos();
    } else {
      const err = document.getElementById("auth-error");
      if (err) err.style.display = "block";
      document.getElementById("admin-password").value = "";
    }
  });
}

// ── Fetch all photos (including hidden) ───────────────────────────────────────

async function loadPhotos() {
  setListContent('<p class="admin-status">กำลังโหลด…</p>');
  try {
    const res = await fetch(`${SHEET_URL}?type=photos_all`, {
      method: "GET",
      redirect: "follow",
    });
    const data = res.ok ? await res.json() : [];
    // Guard: only accept items that look like photo records
    photos = Array.isArray(data)
      ? data.filter(
          (item) => item && typeof item.url === "string" && item.url.startsWith("http")
        )
      : [];
  } catch {
    photos = [];
  }
  renderPhotoList();
  updatePhotoCount();
}

function updatePhotoCount() {
  const el = document.getElementById("photo-count");
  if (el) el.textContent = photos.length ? `${photos.length} รูป` : "";
}

// ── Render list ───────────────────────────────────────────────────────────────

function renderPhotoList() {
  const list = document.getElementById("photo-list");
  if (!list) return;

  if (photos.length === 0) {
    list.innerHTML =
      '<p class="admin-status">ยังไม่มีรูปภาพ — เพิ่มรูปแรกได้เลย</p>';
    return;
  }

  list.innerHTML = "";
  photos.forEach((photo, i) => {
    list.appendChild(buildPhotoItem(photo, i));
  });
}

function buildPhotoItem(photo, index) {
  const item = document.createElement("div");
  item.className = "photo-item" + (photo.visible ? "" : " photo-item--hidden");

  const thumb = photo.url
    ? `<img class="photo-thumb" src="${getSizedUrl(photo.url, 200)}" alt="" loading="lazy" />`
    : `<div class="photo-thumb-placeholder"></div>`;

  const cat = photo.category || "ไม่มีหมวด";
  const catLabel =
    cat === "pre-wedding" ? "Pre-wedding" : cat === "wedding" ? "วันงาน" : cat;

  item.innerHTML = `
    ${thumb}
    <div class="photo-info">
      <p class="photo-caption-text">${escHtml(photo.caption || "(ไม่มี caption)")}</p>
      <div class="photo-meta">
        <span class="photo-category-badge">${escHtml(catLabel)}</span>
        <span class="photo-order">#${photo.order ?? index + 1}</span>
      </div>
    </div>
    <div class="photo-actions">
      <button class="action-btn action-btn--vis${photo.visible ? " active" : ""}"
        title="${photo.visible ? "ซ่อน" : "แสดง"}">
        ${photo.visible ? eyeIcon() : eyeOffIcon()}
      </button>
      <button class="action-btn action-btn--up" title="ขึ้น" ${index === 0 ? "disabled" : ""}>↑</button>
      <button class="action-btn action-btn--down" title="ลง" ${index === photos.length - 1 ? "disabled" : ""}>↓</button>
      <button class="action-btn action-btn--del" title="ลบ">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>`;

  item
    .querySelector(".action-btn--vis")
    .addEventListener("click", () =>
      handleToggleVisible(photo.id, !photo.visible),
    );
  item
    .querySelector(".action-btn--up")
    .addEventListener("click", () => handleReorder(index, index - 1));
  item
    .querySelector(".action-btn--down")
    .addEventListener("click", () => handleReorder(index, index + 1));
  item
    .querySelector(".action-btn--del")
    .addEventListener("click", () => handleDelete(photo.id));

  return item;
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function handleToggleVisible(id, visible) {
  showToast(visible ? "แสดงรูปแล้ว" : "ซ่อนรูปแล้ว");
  await post({ type: "photo_update", id, visible });
  await loadPhotos();
}

async function handleReorder(fromIdx, toIdx) {
  if (toIdx < 0 || toIdx >= photos.length) return;
  const a = photos[fromIdx];
  const b = photos[toIdx];
  // Swap order values
  await post({ type: "photo_update", id: a.id, order: b.order ?? toIdx + 1 });
  await post({ type: "photo_update", id: b.id, order: a.order ?? fromIdx + 1 });
  await loadPhotos();
}

async function handleDelete(id) {
  if (!confirm("ลบรูปนี้? ไม่สามารถกู้คืนได้")) return;
  showToast("ลบรูปแล้ว");
  await post({ type: "photo_delete", id });
  await loadPhotos();
}

// ── Add form ──────────────────────────────────────────────────────────────────

function setupAddForm() {
  const form = document.getElementById("add-photo-form");
  const urlInput = document.getElementById("new-url");
  const previewWrap = document.getElementById("url-preview-wrap");
  const previewImg = document.getElementById("url-preview");
  const btn = document.getElementById("btn-add-photo");

  urlInput?.addEventListener("input", () => {
    const url = urlInput.value.trim();
    if (url && previewWrap && previewImg) {
      previewImg.src = getSizedUrl(url, 400);
      previewWrap.classList.add("visible");
    } else if (previewWrap) {
      previewWrap.classList.remove("visible");
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = urlInput?.value.trim();
    if (!url) return;

    if (btn) {
      btn.disabled = true;
      btn.textContent = "กำลังเพิ่ม…";
    }

    await post({
      type: "photo_add",
      url: cleanUrl(url),
      caption: document.getElementById("new-caption")?.value.trim() ?? "",
      category: document.getElementById("new-category")?.value ?? "",
      order: photos.length + 1,
      visible: true,
    });

    form.reset();
    if (previewWrap) previewWrap.classList.remove("visible");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "+ เพิ่มรูป";
    }

    showToast("เพิ่มรูปภาพแล้ว ✓");
    await loadPhotos();
  });
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function post(payload) {
  try {
    // Use text/plain to avoid CORS preflight — GAS still receives the body via e.postData.contents
    await fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
    // GAS needs a moment to write
    await new Promise((r) => setTimeout(r, 1200));
  } catch {
    // no-cors response is always opaque — errors are silent
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function getSizedUrl(url, size) {
  if (!url) return "";
  // Strip any existing sizing params (=w... including -h...-s-no-gm and ?authuser=N)
  if (url.includes("googleusercontent.com")) {
    const base = url.replace(/=w[^?#]+(?:[?#].*)?$/, "");
    return `${base}=w${size}`;
  }
  return url;
}

/** Return the clean base URL (no size params, no ?authuser) for storage */
function cleanUrl(url) {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=w[^?#]+(?:[?#].*)?$/, "");
  }
  return url;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setListContent(html) {
  const list = document.getElementById("photo-list");
  if (list) list.innerHTML = html;
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("toast--show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("toast--show"), 2200);
}

function eyeIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
function eyeOffIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  setupAddForm();
  document.getElementById("refresh-btn")?.addEventListener("click", loadPhotos);
});
