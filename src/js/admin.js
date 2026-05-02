const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

const ADMIN_PW = "30122001";
const AUTH_KEY = "gallery_admin_auth";

// ── State ─────────────────────────────────────────────────────────────────────
let photos = [];
let rsvpData = [];
let gbData = [];
let cfgData = {};
let activeTab = sessionStorage.getItem("admin_tab") || "event";
let tabLoaded = {};

// ── Bootstrap config (inject names into auth screen / topbar) ─────────────────
async function bootstrapConfig() {
  try {
    const res = await fetch(`${SHEET_URL}?type=config&_t=${Date.now()}`, {
      redirect: "follow",
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || typeof data !== "object") return;
    const groom = data.groom_name || "นนท์";
    const bride = data.bride_name || "เมย์";
    const couple = `${groom} & ${bride}`;
    const authSub = document.getElementById("auth-sub");
    if (authSub) authSub.textContent = couple;
    const adminBrand = document.getElementById("admin-brand");
    if (adminBrand) adminBrand.textContent = `Admin — ${couple}`;
  } catch {
    /* silent fail — names just stay as default */
  }
}

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
    initAdmin();
    return;
  }

  document.getElementById("auth-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = document.getElementById("admin-password")?.value ?? "";
    if (pw === ADMIN_PW) {
      sessionStorage.setItem(AUTH_KEY, "1");
      authScreen.style.display = "none";
      adminScreen.style.display = "block";
      initAdmin();
    } else {
      const err = document.getElementById("auth-error");
      if (err) err.style.display = "block";
      document.getElementById("admin-password").value = "";
    }
  });
}

// ── Tab Navigation ────────────────────────────────────────────────────────────
function showTab(name) {
  // P4-2: Warn if event tab has unsaved changes
  if (activeTab === "event" && name !== "event") {
    const unsaved = document.getElementById("ev-unsaved");
    if (unsaved?.classList.contains("visible")) {
      const leave = confirm(
        "ยังมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ออกจากหน้านี้?",
      );
      if (!leave) return;
    }
  }
  document.querySelectorAll(".tab-panel").forEach((el) => {
    el.classList.toggle("tab-panel--hidden", el.id !== `tab-${name}`);
  });
  document.querySelectorAll(".tab-item, .bnav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === name);
  });
  activeTab = name;
  sessionStorage.setItem("admin_tab", name);
  loadTabOnce(name);
}

function loadTabOnce(name) {
  if (tabLoaded[name]) return;
  tabLoaded[name] = true;
  if (name === "event") loadEventConfig();
  if (name === "gallery") loadPhotos();
  if (name === "rsvp") loadRsvp();
  if (name === "guestbook") loadGuestbook();
  if (name === "music") loadMusicTravel();
}

function initTabs() {
  document.querySelectorAll(".tab-item, .bnav-item").forEach((el) => {
    el.addEventListener("click", () => showTab(el.dataset.tab));
  });
  showTab(activeTab);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let toastTimer;
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast toast--${type} toast--show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("toast--show"), 2400);
}

async function apiGet(params) {
  const url = `${SHEET_URL}?${new URLSearchParams({ ...params, _t: Date.now() })}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  return res.json();
}

async function apiPost(payload) {
  await fetch(SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
  });
}

function confirmDialog(msg) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-overlay");
    document.getElementById("confirm-msg").textContent = msg;
    overlay.style.display = "flex";
    const onOk = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    function cleanup() {
      overlay.style.display = "none";
      document.getElementById("confirm-ok").removeEventListener("click", onOk);
      document
        .getElementById("confirm-cancel")
        .removeEventListener("click", onCancel);
    }
    document.getElementById("confirm-ok").addEventListener("click", onOk);
    document
      .getElementById("confirm-cancel")
      .addEventListener("click", onCancel);
  });
}

// ── Config value normalizer ───────────────────────────────────────────────────
// Google Sheets auto-converts cells that look like dates/times to ISO strings.
// e.g. "2026-07-31" → "2026-07-31T00:00:00.000Z"
//      "13:00"      → "1899-12-30T13:00:00.000Z"  (Sheets time-only epoch)
//
// We detect these patterns and convert back to plain strings before populating fields.

function normalizeConfigValue(key, raw) {
  if (typeof raw !== "string") return raw;

  // ISO datetime string (ends with Z or +offset)
  const isoRe =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  if (!isoRe.test(raw)) return raw; // not an ISO string, keep as-is

  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;

  // Time-only fields: Sheets encodes them as 1899-12-30T<HH:MM:SS>
  // (or 1899-12-29 in some timezones) — extract just HH:MM
  if (d.getUTCFullYear() <= 1900) {
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  // Date-only fields (keys ending in _iso or _display that contain a date)
  // Return YYYY-MM-DD so <input type="date"> fields populate correctly
  if (key.endsWith("_iso") || key.endsWith("_display")) {
    const yyyy = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mo}-${dd}`;
  }

  // Generic date — return ISO date portion
  return d.toISOString().slice(0, 10);
}

// ── Event Info Tab ────────────────────────────────────────────────────────────
const EV_FIELDS = {
  "ev-groom": "groom_name",
  "ev-bride": "bride_name",
  "ev-date-iso": "event_date_iso",
  "ev-date-display": "event_date_display",
  "ev-time-ceremony": "event_time_ceremony",
  "ev-time-lunch": "event_time_lunch",
  "ev-venue": "venue_name",
  "ev-maps-url": "venue_maps_url",
  "ev-maps-embed": "venue_maps_embed",
  "ev-dress": "dress_code",
  "ev-rsvp-iso": "rsvp_deadline_iso",
  "ev-rsvp-display": "rsvp_deadline_display",
};

async function loadEventConfig() {
  const retryEl = document.getElementById("ev-error");
  const overlay = document.getElementById("ev-loading-overlay");
  const formCard = document.querySelector("#tab-event .form-card");
  if (retryEl) retryEl.style.display = "none";
  if (overlay) overlay.classList.add("visible");
  if (formCard) formCard.classList.add("fields-loading");
  try {
    cfgData = await apiGet({ type: "config" });
  } catch {
    if (overlay) overlay.classList.remove("visible");
    if (formCard) formCard.classList.remove("fields-loading");
    if (retryEl) retryEl.style.display = "flex";
    showToast("โหลด config ไม่ได้", "error");
    cfgData = {};
    return;
  }
  if (overlay) overlay.classList.remove("visible");
  if (formCard) formCard.classList.remove("fields-loading");
  Object.entries(EV_FIELDS).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (el && cfgData[key] != null) {
      const normalized = normalizeConfigValue(key, cfgData[key]);
      el.value = normalized;
      // Keep cfgData in sync with the normalized value so dirty-check works correctly
      cfgData[key] = normalized;
    }
  });
  markEvClean();
}

function markEvClean() {
  document.getElementById("ev-unsaved").classList.remove("visible");
}

function initEventTab() {
  Object.keys(EV_FIELDS).forEach((elId) => {
    document.getElementById(elId)?.addEventListener("input", () => {
      document.getElementById("ev-unsaved").classList.add("visible");
    });
  });

  document
    .getElementById("btn-save-event")
    ?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-save-event");
      btn.disabled = true;
      btn.textContent = "กำลังบันทึก…";
      let hasChange = false;
      const posts = [];
      Object.entries(EV_FIELDS).forEach(([elId, key]) => {
        const el = document.getElementById(elId);
        if (!el) return;
        const val = el.value.trim();
        if (val !== String(cfgData[key] ?? "")) {
          posts.push(apiPost({ type: "config_update", key, value: val }));
          cfgData[key] = val;
          hasChange = true;
        }
      });
      await Promise.allSettled(posts);
      btn.disabled = false;
      btn.textContent = "บันทึก Event Info";
      if (hasChange) {
        markEvClean();
        showToast("บันทึก Event Info แล้ว ✓");
      } else showToast("ไม่มีการเปลี่ยนแปลง", "info");
    });
}

// ── Gallery Tab ───────────────────────────────────────────────────────────────
async function loadPhotos() {
  setListContent('<p class="admin-status">กำลังโหลด…</p>');
  const retryEl = document.getElementById("gallery-error");
  const refreshBtn = document.getElementById("refresh-btn");
  if (retryEl) retryEl.style.display = "none";
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "↻ โหลด…";
  }
  try {
    const data = await apiGet({ type: "photos_all" });
    photos = Array.isArray(data)
      ? data.filter(
          (p) => p && typeof p.url === "string" && p.url.startsWith("http"),
        )
      : [];
  } catch {
    photos = [];
    setListContent("");
    if (retryEl) retryEl.style.display = "flex";
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "↻ รีเฟรช";
    }
    showToast("โหลดรูปไม่ได้", "error");
    return;
  }
  if (refreshBtn) {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "↻ รีเฟรช";
  }
  renderPhotoList();
  updatePhotoCount();
}

function updatePhotoCount() {
  const el = document.getElementById("photo-count");
  if (el) el.textContent = photos.length ? `${photos.length} รูป` : "";
}

function setListContent(html) {
  const list = document.getElementById("photo-list");
  if (list) list.innerHTML = html;
}

function renderPhotoList() {
  const list = document.getElementById("photo-list");
  if (!list) return;
  if (photos.length === 0) {
    list.innerHTML =
      '<p class="admin-status">ยังไม่มีรูปภาพ — เพิ่มรูปแรกได้เลย</p>';
    return;
  }
  list.innerHTML = "";
  photos.forEach((photo, i) => list.appendChild(buildPhotoItem(photo, i)));
}

function buildPhotoItem(photo, index) {
  const item = document.createElement("div");
  item.className = "photo-item" + (photo.visible ? "" : " photo-item--hidden");

  const thumb = photo.url
    ? `<img class="photo-thumb" src="${getSizedUrl(photo.url, 200)}" alt="" loading="lazy" />`
    : `<div class="photo-thumb-placeholder"></div>`;

  const cat = photo.category || "";
  const catLabel =
    cat === "pre-wedding"
      ? "Pre-wedding"
      : cat === "wedding"
        ? "วันงาน"
        : cat || "—";

  item.innerHTML = `
    ${thumb}
    <div class="photo-info">
      <input class="photo-caption-input" type="text" value="${escHtml(photo.caption || "")}" placeholder="(ไม่มี caption — คลิกเพื่อแก้ไข)" />
      <div class="photo-meta">
        <span class="photo-category-badge">${escHtml(catLabel)}</span>
        <span class="photo-order">#${photo.order ?? index + 1}</span>
      </div>
    </div>
    <div class="photo-actions">
      <button class="btn-icon btn-icon--vis${photo.visible ? " active" : ""}" title="${photo.visible ? "ซ่อน" : "แสดง"}">
        ${photo.visible ? eyeIcon() : eyeOffIcon()}
      </button>
      <button class="btn-icon btn-icon--up" title="ขึ้น" ${index === 0 ? "disabled" : ""}>↑</button>
      <button class="btn-icon btn-icon--down" title="ลง" ${index === photos.length - 1 ? "disabled" : ""}>↓</button>
      <button class="btn-icon btn-icon--del" title="ลบ">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>`;

  item
    .querySelector(".btn-icon--vis")
    .addEventListener("click", () =>
      handleToggleVisible(photo.id, !photo.visible),
    );
  item
    .querySelector(".btn-icon--up")
    .addEventListener("click", () => handleReorder(index, index - 1));
  item
    .querySelector(".btn-icon--down")
    .addEventListener("click", () => handleReorder(index, index + 1));
  item
    .querySelector(".btn-icon--del")
    .addEventListener("click", () => handleDeletePhoto(photo.id));

  const captionInput = item.querySelector(".photo-caption-input");
  let captionOriginal = photo.caption || "";
  captionInput.addEventListener("blur", () => {
    const val = captionInput.value.trim();
    if (val === captionOriginal) return;
    captionOriginal = val;
    const idx = photos.findIndex((p) => p.id === photo.id);
    if (idx !== -1) photos[idx] = { ...photos[idx], caption: val };
    apiPost({ type: "photo_update", id: photo.id, caption: val });
    showToast("บันทึก caption แล้ว ✓");
  });
  captionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") captionInput.blur();
    if (e.key === "Escape") {
      captionInput.value = captionOriginal;
      captionInput.blur();
    }
  });

  return item;
}

function handleToggleVisible(id, visible) {
  const idx = photos.findIndex((p) => p.id === id);
  if (idx === -1) return;
  photos[idx] = { ...photos[idx], visible };
  renderPhotoList();
  updatePhotoCount();
  showToast(visible ? "แสดงรูปแล้ว" : "ซ่อนรูปแล้ว");
  apiPost({ type: "photo_update", id, visible });
}

function handleReorder(fromIdx, toIdx) {
  if (toIdx < 0 || toIdx >= photos.length) return;
  const a = photos[fromIdx],
    b = photos[toIdx];
  [photos[fromIdx], photos[toIdx]] = [photos[toIdx], photos[fromIdx]];
  photos[fromIdx] = { ...photos[fromIdx], order: a.order ?? fromIdx + 1 };
  photos[toIdx] = { ...photos[toIdx], order: b.order ?? toIdx + 1 };
  renderPhotoList();
  apiPost({ type: "photo_update", id: a.id, order: b.order ?? toIdx + 1 });
  apiPost({ type: "photo_update", id: b.id, order: a.order ?? fromIdx + 1 });
}

async function handleDeletePhoto(id) {
  const ok = await confirmDialog("ลบรูปนี้? ไม่สามารถกู้คืนได้");
  if (!ok) return;
  photos = photos.filter((p) => p.id !== id);
  renderPhotoList();
  updatePhotoCount();
  showToast("ลบรูปแล้ว");
  apiPost({ type: "photo_delete", id });
}

function initGalleryTab() {
  const form = document.getElementById("add-photo-form");
  const urlInput = document.getElementById("new-url");
  const prevWrap = document.getElementById("url-preview-wrap");
  const prevImg = document.getElementById("url-preview");

  urlInput?.addEventListener("input", () => {
    const url = urlInput.value.trim();
    if (url && prevWrap && prevImg) {
      prevImg.src = getSizedUrl(url, 400);
      prevWrap.classList.add("visible");
    } else if (prevWrap) {
      prevWrap.classList.remove("visible");
    }
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = urlInput?.value.trim();
    if (!url) return;
    const newPhoto = {
      id: String(Date.now()),
      url: cleanUrl(url),
      caption: document.getElementById("new-caption")?.value.trim() ?? "",
      category: document.getElementById("new-category")?.value ?? "",
      order: photos.length + 1,
      visible: true,
      timestamp: new Date().toISOString(),
    };
    photos.push(newPhoto);
    renderPhotoList();
    updatePhotoCount();
    form.reset();
    if (prevWrap) prevWrap.classList.remove("visible");
    showToast("เพิ่มรูปภาพแล้ว ✓");
    apiPost({ type: "photo_add", ...newPhoto });
  });

  document.getElementById("refresh-btn")?.addEventListener("click", () => {
    tabLoaded["gallery"] = false;
    loadPhotos();
  });
}

function getSizedUrl(url, size) {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=w[^?#]+(?:[?#].*)?$/, "") + `=w${size}`;
  }
  return url;
}

function cleanUrl(url) {
  if (!url) return "";
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=w[^?#]+(?:[?#].*)?$/, "");
  }
  return url;
}

function eyeIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
function eyeOffIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

// ── RSVP Tab ──────────────────────────────────────────────────────────────────
async function loadRsvp() {
  document.getElementById("rsvp-loading").style.display = "block";
  document.getElementById("rsvp-empty").style.display = "none";
  const retryEl = document.getElementById("rsvp-error");
  if (retryEl) retryEl.style.display = "none";
  try {
    rsvpData = await apiGet({ type: "rsvp_all" });
    if (!Array.isArray(rsvpData)) rsvpData = [];
  } catch {
    rsvpData = [];
    if (retryEl) retryEl.style.display = "flex";
    showToast("โหลด RSVP ไม่ได้", "error");
  }
  document.getElementById("rsvp-loading").style.display = "none";
  renderRsvp();
}

function renderRsvp() {
  const search =
    document.getElementById("rsvp-search")?.value.toLowerCase() || "";
  const filter = document.getElementById("rsvp-filter")?.value || "";

  const filtered = rsvpData.filter((r) => {
    const name = String(r["ชื่อ"] || "").toLowerCase();
    const attend = String(r["การเข้าร่วม"] || "");
    return name.includes(search) && (!filter || attend === filter);
  });

  // Summary (from all data, not filtered)
  const coming = rsvpData.filter((r) =>
    String(r["การเข้าร่วม"]).includes("ยินดี"),
  );
  const notcoming = rsvpData.filter((r) =>
    String(r["การเข้าร่วม"]).includes("ไม่สะดวก"),
  );
  const guests = coming.reduce((s, r) => s + (Number(r["จำนวน"]) || 0), 0);
  document.getElementById("rsvp-count-coming").textContent = coming.length;
  document.getElementById("rsvp-count-notcoming").textContent =
    notcoming.length;
  document.getElementById("rsvp-count-guests").textContent = guests;
  document.getElementById("rsvp-count-total").textContent = rsvpData.length;

  const tbody = document.getElementById("rsvp-tbody");
  const empty = document.getElementById("rsvp-empty");
  if (!filtered.length) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = filtered
    .map((r, i) => {
      const attend = String(r["การเข้าร่วม"] || "");
      const isComing = attend.includes("ยินดี");
      const badgeClass = isComing
        ? "status-badge--coming"
        : "status-badge--notcoming";
      const badgeText = isComing ? "มา" : "ไม่มา";
      return `<tr>
      <td>${i + 1}</td>
      <td><span class="td-truncate" style="max-width:120px" title="${escHtml(r["ชื่อ"] || "")}">${escHtml(r["ชื่อ"] || "—")}</span></td>
      <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
      <td>${escHtml(r["จำนวน"] || "—")}</td>
      <td><span class="td-truncate" style="max-width:100px" title="${escHtml(r["ติดต่อ"] || "")}">${escHtml(r["ติดต่อ"] || "—")}</span></td>
      <td><span class="td-truncate" title="${escHtml(r["ข้อความ"] || "")}">${escHtml(r["ข้อความ"] || "—")}</span></td>
      <td style="white-space:nowrap;font-size:11px;color:var(--muted)">${escHtml(r["timestamp"] || "")}</td>
    </tr>`;
    })
    .join("");
}

function exportRsvpCsv() {
  if (!rsvpData.length) {
    showToast("ไม่มีข้อมูล", "error");
    return;
  }
  const headers = [
    "#",
    "ชื่อ",
    "การเข้าร่วม",
    "จำนวน",
    "ติดต่อ",
    "ข้อความ",
    "เวลา",
  ];
  const rows = rsvpData.map((r, i) =>
    [
      i + 1,
      r["ชื่อ"] || "",
      r["การเข้าร่วม"] || "",
      r["จำนวน"] || "",
      r["ติดต่อ"] || "",
      r["ข้อความ"] || "",
      r["timestamp"] || "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "rsvp.csv";
  link.click();
}

function initRsvpTab() {
  document.getElementById("rsvp-search")?.addEventListener("input", renderRsvp);
  document
    .getElementById("rsvp-filter")
    ?.addEventListener("change", renderRsvp);
  document
    .getElementById("btn-export-rsvp")
    ?.addEventListener("click", exportRsvpCsv);
}

// ── Guestbook Tab ─────────────────────────────────────────────────────────────
async function loadGuestbook() {
  document.getElementById("guestbook-loading").style.display = "block";
  document.getElementById("guestbook-empty").style.display = "none";
  const retryEl = document.getElementById("guestbook-error");
  if (retryEl) retryEl.style.display = "none";
  try {
    gbData = await apiGet({ type: "guestbook_all" });
    if (!Array.isArray(gbData)) gbData = [];
  } catch {
    gbData = [];
    if (retryEl) retryEl.style.display = "flex";
    showToast("โหลด Guestbook ไม่ได้", "error");
  }
  document.getElementById("guestbook-loading").style.display = "none";
  renderGuestbook();
}

function renderGuestbook() {
  const showHidden = document.getElementById("show-hidden-entries")?.checked;
  const filtered = showHidden ? gbData : gbData.filter((e) => !e.hidden);

  const tbody = document.getElementById("guestbook-tbody");
  const empty = document.getElementById("guestbook-empty");

  if (!filtered.length) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = filtered
    .map((entry, i) => {
      const hiddenBadge = entry.hidden
        ? '<span class="status-badge status-badge--hidden">ซ่อนอยู่</span>'
        : "";
      return `<tr data-id="${escHtml(String(entry.id || ""))}">
      <td>${i + 1}</td>
      <td><span class="td-truncate" style="max-width:100px" title="${escHtml(entry.name || "")}">${escHtml(entry.name || "—")}</span></td>
      <td><span class="td-truncate" title="${escHtml(entry.message || "")}">${escHtml(entry.message || "—")}</span></td>
      <td style="white-space:nowrap;font-size:11px;color:var(--muted)">${escHtml(formatGbTimestamp(entry.timestamp))}</td>
      <td>${hiddenBadge}</td>
      <td>
        <div class="td-actions">
          <button class="btn-icon btn-gb-hide" title="${entry.hidden ? "แสดง" : "ซ่อน"}">${entry.hidden ? eyeIcon() : eyeOffIcon()}</button>
          <button class="btn-icon btn-icon--del btn-gb-del" title="ลบ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`;
    })
    .join("");

  // Attach event listeners
  tbody.querySelectorAll(".btn-gb-hide").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest("tr").dataset.id;
      const entry = gbData.find((e) => String(e.id) === id);
      if (!entry) return;
      handleGbHide(id, !entry.hidden);
    });
  });
  tbody.querySelectorAll(".btn-gb-del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest("tr").dataset.id;
      handleGbDelete(id);
    });
  });
}

function formatGbTimestamp(raw) {
  if (!raw) return "—";
  const s = String(raw);
  // Already Thai format: dd/MM/yyyy HH:mm:ss
  const thaiRe = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/;
  const tm = s.match(thaiRe);
  if (tm) return `${tm[1]}/${tm[2]}/${tm[3]} ${tm[4]}`;
  // ISO string from Sheets
  const isoRe = /^\d{4}-\d{2}-\d{2}T/;
  if (isoRe.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      });
    }
  }
  return s;
}

function handleGbHide(id, hidden) {
  const entry = gbData.find((e) => String(e.id) === id);
  if (!entry) return;
  entry.hidden = hidden;
  renderGuestbook();
  showToast(hidden ? "ซ่อนข้อความแล้ว" : "แสดงข้อความแล้ว");
  apiPost({ type: "guestbook_hide", id, hidden }).then(() => {
    // Re-fetch after 1.5s to confirm server actually updated
    setTimeout(() => loadGuestbook(), 1500);
  });
}

async function handleGbDelete(id) {
  const ok = await confirmDialog("ลบข้อความนี้ออกจาก Guestbook?");
  if (!ok) return;
  gbData = gbData.filter((e) => String(e.id) !== id);
  renderGuestbook();
  showToast("ลบข้อความแล้ว");
  apiPost({ type: "guestbook_delete", id });
}

function initGuestbookTab() {
  document
    .getElementById("show-hidden-entries")
    ?.addEventListener("change", renderGuestbook);
}

// ── Music & Travel Tab ────────────────────────────────────────────────────────

/**
 * แปลง Google Drive URL (uc?export=download) → drive.usercontent.google.com
 * เพื่อให้ <audio> element stream ได้โดยตรงโดยไม่ติด redirect/virus-scan page
 */
function resolveAudioUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (
      (u.hostname === "drive.google.com" && u.pathname.startsWith("/uc")) ||
      u.hostname === "drive.usercontent.google.com"
    ) {
      const id = u.searchParams.get("id");
      if (id) return `/api/proxy-audio?id=${encodeURIComponent(id)}`;
    }
  } catch {}
  return url;
}

/* เพลงใน /public/music/ — inject โดย Vite plugin ตอน build */
const LOCAL_MUSIC =
  typeof __LOCAL_MUSIC__ !== "undefined" ? __LOCAL_MUSIC__ : [];

function buildMusicOptions(currentUrl, extraUrls = []) {
  const sel = document.getElementById("music-select");
  if (!sel) return;
  sel.innerHTML = "";
  const all = [
    ...LOCAL_MUSIC,
    ...extraUrls.map((u) => ({ label: u.split("/").pop(), url: u })),
  ];
  if (!all.length) {
    sel.innerHTML = '<option value="">— ไม่พบไฟล์เพลงในคลัง —</option>';
    return;
  }
  all.forEach(({ label, url }) => {
    const opt = document.createElement("option");
    opt.value = url;
    opt.textContent = label;
    if (url === currentUrl) opt.selected = true;
    sel.appendChild(opt);
  });
}

function setMusicCurrentLabel(url) {
  const el = document.getElementById("music-current-label");
  if (el) el.textContent = url ? url.split("/").pop() : "-";
}

function getMusicActiveUrl() {
  const mode = document.querySelector(".music-mode-btn.active")?.dataset.mode;
  if (mode === "library")
    return document.getElementById("music-select")?.value || "";
  if (mode === "url")
    return document.getElementById("music-url-custom")?.value.trim() || "";
  return "";
}

async function loadMusicTravel() {
  const overlay = document.getElementById("music-loading-overlay");
  const cards = document.querySelectorAll("#tab-music .form-card");
  if (overlay) overlay.classList.add("visible");
  cards.forEach((c) => c.classList.add("fields-loading"));
  try {
    const cfg = await apiGet({ type: "config" });
    cfgData = { ...cfgData, ...cfg };
  } catch {}
  if (overlay) overlay.classList.remove("visible");
  cards.forEach((c) => c.classList.remove("fields-loading"));

  const currentUrl = cfgData["music_url"] || "";
  let extraUrls = [];
  try {
    extraUrls = JSON.parse(cfgData["music_library"] || "[]");
  } catch {}

  buildMusicOptions(currentUrl, extraUrls);
  setMusicCurrentLabel(currentUrl);

  // ถ้า URL ปัจจุบันไม่อยู่ใน library → switch ไป URL mode อัตโนมัติ
  const allUrls = [...LOCAL_MUSIC.map((f) => f.url), ...extraUrls];
  if (currentUrl && !allUrls.includes(currentUrl)) {
    switchMusicMode("url");
    const inp = document.getElementById("music-url-custom");
    if (inp) inp.value = currentUrl;
  }

  const travelAirport = document.getElementById("travel-airport");
  if (travelAirport) travelAirport.value = cfgData["travel_airport"] || "";
  const travelHotel = document.getElementById("travel-hotel");
  if (travelHotel) travelHotel.value = cfgData["travel_hotel"] || "";
  const travelCar = document.getElementById("travel-car");
  if (travelCar) travelCar.value = cfgData["travel_car"] || "";
}

function switchMusicMode(mode) {
  document
    .querySelectorAll(".music-mode-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  ["library", "url", "upload"].forEach((m) => {
    const el = document.getElementById(`music-panel-${m}`);
    if (el) el.style.display = m === mode ? "" : "none";
  });
}

function markUnsaved(badgeId) {
  document.getElementById(badgeId)?.classList.add("visible");
}

function clearUnsaved(badgeId) {
  document.getElementById(badgeId)?.classList.remove("visible");
}

function initMusicTab() {
  // Mode switching
  document.querySelectorAll(".music-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchMusicMode(btn.dataset.mode);
      markUnsaved("music-unsaved");
    });
  });

  // Mark unsaved when inputs change
  document
    .getElementById("music-select")
    ?.addEventListener("change", () => markUnsaved("music-unsaved"));
  document
    .getElementById("music-url-custom")
    ?.addEventListener("input", () => markUnsaved("music-unsaved"));

  // File chooser → auto-upload
  const fileInput = document.getElementById("music-file-input");
  document
    .getElementById("btn-choose-file")
    ?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => handleMusicFileSelect(fileInput));

  // Travel unsaved tracking
  ["travel-airport", "travel-hotel", "travel-car"].forEach((id) => {
    document
      .getElementById(id)
      ?.addEventListener("input", () => markUnsaved("travel-unsaved"));
  });

  // Preview button
  const previewBtn = document.getElementById("btn-preview-music");
  const previewAudio = document.getElementById("music-preview-audio");
  if (previewBtn && previewAudio) {
    previewAudio.addEventListener("ended", () => {
      previewBtn.textContent = "▶ ลองฟัง";
    });
    previewBtn.addEventListener("click", () => {
      const url = getMusicActiveUrl();
      if (!url) {
        showToast("เลือกเพลงก่อนนะ", "error");
        return;
      }
      if (!previewAudio.paused) {
        previewAudio.pause();
        previewAudio.currentTime = 0;
        previewBtn.textContent = "▶ ลองฟัง";
      } else {
        previewAudio.src = resolveAudioUrl(url);
        previewAudio
          .play()
          .then(() => { previewBtn.textContent = "⏹ หยุด"; })
          .catch((err) => {
            console.error("[Music Preview] เล่นไม่ได้", {
              originalUrl: url,
              error: err?.message,
              name: err?.name,
              code: previewAudio.error?.code,
              mediaError: previewAudio.error,
            });
            showToast("เล่นเพลงไม่ได้ — ตรวจสอบ URL", "error");
          });
      }
    });
  }

  // Save music button
  document
    .getElementById("btn-save-music")
    ?.addEventListener("click", async () => {
      const mode = document.querySelector(".music-mode-btn.active")?.dataset
        .mode;
      if (mode === "upload") {
        showToast("อัปโหลดไฟล์ก่อน หรือเลือกโหมดอื่น", "error");
        return;
      }
      const btn = document.getElementById("btn-save-music");
      btn.disabled = true;
      btn.textContent = "กำลังบันทึก…";
      const val = getMusicActiveUrl();
      await apiPost({ type: "config_update", key: "music_url", value: val });
      cfgData["music_url"] = val;
      setMusicCurrentLabel(val);
      btn.disabled = false;
      btn.textContent = "บันทึก";
      clearUnsaved("music-unsaved");
      showToast("บันทึก URL เพลงแล้ว ✓");
    });

  // Save travel button
  document
    .getElementById("btn-save-travel")
    ?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-save-travel");
      btn.disabled = true;
      btn.textContent = "กำลังบันทึก…";
      const fields = {
        travel_airport:
          document.getElementById("travel-airport")?.value.trim() || "",
        travel_hotel:
          document.getElementById("travel-hotel")?.value.trim() || "",
        travel_car: document.getElementById("travel-car")?.value.trim() || "",
      };
      await Promise.allSettled(
        Object.entries(fields).map(([key, value]) =>
          apiPost({ type: "config_update", key, value }),
        ),
      );
      Object.assign(cfgData, fields);
      btn.disabled = false;
      btn.textContent = "บันทึก";
      clearUnsaved("travel-unsaved");
      showToast("บันทึก Travel Info แล้ว ✓");
    });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleMusicFileSelect(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  const MAX_MB = 8;
  if (file.size > MAX_MB * 1024 * 1024) {
    showToast(`ไฟล์ใหญ่เกิน ${MAX_MB}MB`, "error");
    fileInput.value = "";
    return;
  }

  document.getElementById("music-file-name").textContent = file.name;

  const progressWrap = document.getElementById("music-upload-progress");
  const progressFill = document.getElementById("upload-bar-fill");
  const progressText = document.getElementById("upload-progress-text");

  progressWrap.style.display = "block";
  progressFill.style.width = "20%";
  progressText.textContent = "กำลังอ่านไฟล์...";

  try {
    const base64 = await readFileAsBase64(file);
    progressFill.style.width = "50%";
    progressText.textContent = "กำลังอัปโหลด...";

    const resp = await fetch("/api/upload-music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        data: base64,
        mimeType: file.type,
      }),
    });

    progressFill.style.width = "90%";
    if (!resp.ok) throw new Error("upload failed");
    const result = await resp.json();
    if (!result.url) throw new Error("no url");

    progressFill.style.width = "100%";
    progressText.textContent = "อัปโหลดสำเร็จ!";

    // Persist new URL to music_library
    let extraUrls = [];
    try {
      extraUrls = JSON.parse(cfgData["music_library"] || "[]");
    } catch {}
    if (!extraUrls.includes(result.url)) extraUrls.push(result.url);
    cfgData["music_library"] = JSON.stringify(extraUrls);
    apiPost({
      type: "config_update",
      key: "music_library",
      value: JSON.stringify(extraUrls),
    });

    buildMusicOptions(result.url, extraUrls);
    switchMusicMode("library");
    markUnsaved("music-unsaved");
    showToast("อัปโหลดเพลงสำเร็จ ✓");

    setTimeout(() => {
      progressWrap.style.display = "none";
      progressFill.style.width = "0%";
      fileInput.value = "";
    }, 1500);
  } catch {
    progressWrap.style.display = "none";
    progressFill.style.width = "0%";
    fileInput.value = "";
    document.getElementById("music-file-name").textContent =
      "ยังไม่ได้เลือกไฟล์";
    showToast("อัปโหลดไม่สำเร็จ — ลองใหม่", "error");
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
function initLogout() {
  document.getElementById("sidebar-logout")?.addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initAdmin() {
  initTabs();
  initEventTab();
  initGalleryTab();
  initRsvpTab();
  initGuestbookTab();
  initMusicTab();
  initLogout();
}

document.addEventListener("DOMContentLoaded", () => {
  bootstrapConfig();
  initAuth();
});
