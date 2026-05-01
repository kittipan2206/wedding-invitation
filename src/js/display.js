const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

const POLL_INTERVAL = 10_000; // poll every 10 s
const PAGE_SIZE = 6; // 3 × 2 grid
const PAGE_ROTATE_MS = 20_000; // auto-rotate every 20 s

let allEntries = [];
let knownKeys = new Set();
let currentPage = 0;
let pageTimer = null;
let transitioning = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function entryKey(e) {
  return `${e.name}||${e.message}`;
}

function totalPages() {
  return Math.max(1, Math.ceil(allEntries.length / PAGE_SIZE));
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchEntries() {
  try {
    const res = await fetch(SHEET_URL, { method: "GET", redirect: "follow" });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// ── Card builder ──────────────────────────────────────────────────────────────

function buildCard(e, isNew) {
  const card = document.createElement("div");
  card.className = "display-card" + (isNew ? " display-card--new" : "");
  card.dataset.key = entryKey(e);
  card.innerHTML = `
    ${isNew ? '<span class="card-badge">✦ ใหม่</span>' : ""}
    <div class="display-avatar">${escHtml(Array.from(e.name)[0] || "♡")}</div>
    <div class="display-card-body">
      <p class="display-card-name">${escHtml(e.name)}</p>
      <p class="display-card-msg">${escHtml(e.message)}</p>
    </div>`;

  if (isNew) {
    // Remove badge + glow after 60 s
    setTimeout(() => {
      card.classList.remove("display-card--new");
      card.querySelector(".card-badge")?.remove();
    }, 60_000);
  }
  return card;
}

// ── Render current page ───────────────────────────────────────────────────────
// Reuses existing DOM nodes for unchanged cards → no flicker / re-animation

function renderPage(newKeys = new Set()) {
  const feed = document.getElementById("display-feed");
  if (!feed) return;

  const start = currentPage * PAGE_SIZE;
  const visible = allEntries.slice(start, start + PAGE_SIZE);

  if (visible.length === 0) {
    const p = document.createElement("p");
    p.className = "display-empty";
    p.textContent = "ยังไม่มีคำอวยพร ♡";
    feed.replaceChildren(p);
    return;
  }

  // Index existing cards by key so we can reuse them
  const existingCards = new Map();
  feed.querySelectorAll(".display-card[data-key]").forEach((el) => {
    existingCards.set(el.dataset.key, el);
  });

  const children = visible.map((e) => {
    const k = entryKey(e);
    if (!newKeys.has(k) && existingCards.has(k)) {
      // Reuse unchanged node — no animation triggered
      return existingCards.get(k);
    }
    return buildCard(e, newKeys.has(k));
  });

  feed.replaceChildren(...children);
}

// ── Page indicators ───────────────────────────────────────────────────────────

function updatePageDots() {
  const el = document.getElementById("display-pages");
  if (!el) return;
  updateNavButtons();
  const total = totalPages();
  if (total <= 1) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = Array.from(
    { length: total },
    (_, i) =>
      `<span class="page-dot${i === currentPage ? " page-dot--active" : ""}"></span>`,
  ).join("");
}

function updateTimestamp() {
  const el = document.getElementById("display-updated");
  if (el) {
    el.textContent =
      "อัปเดต " +
      new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
  }
}

// ── Page rotation with fade ───────────────────────────────────────────────────

async function transitionToPage(page) {
  if (transitioning || page === currentPage) return;
  transitioning = true;

  const feed = document.getElementById("display-feed");
  feed.classList.add("feed--exit");
  await delay(320);

  currentPage = page;
  renderPage();
  updatePageDots();

  feed.classList.remove("feed--exit");
  feed.classList.add("feed--enter");
  await delay(500);
  feed.classList.remove("feed--enter");

  transitioning = false;
}

function resetPageTimer() {
  clearInterval(pageTimer);
  if (totalPages() <= 1) return;
  pageTimer = setInterval(() => {
    transitionToPage((currentPage + 1) % totalPages());
  }, PAGE_ROTATE_MS);
}

// ── Poll ──────────────────────────────────────────────────────────────────────

async function poll() {
  const entries = await fetchEntries();
  updateTimestamp();
  if (!entries) return;

  // Find new entries
  const newKeys = new Set();
  entries.forEach((e) => {
    const k = entryKey(e);
    if (!knownKeys.has(k)) newKeys.add(k);
    knownKeys.add(k);
  });

  const changed = newKeys.size > 0 || entries.length !== allEntries.length;
  if (!changed) return; // nothing new → no DOM update, no flicker

  allEntries = entries;

  // If new entries arrived and we're not on page 0, jump there to show them
  if (newKeys.size > 0 && currentPage !== 0 && !transitioning) {
    await transitionToPage(0);
  } else {
    renderPage(newKeys);
  }

  updatePageDots();
  resetPageTimer();
}

// ── Floating petals ───────────────────────────────────────────────────────────

function spawnPetals() {
  const colors = ["#F9C8D4", "#C9B8E8", "#B8E8D8", "#F8D8B8"];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement("div");
    el.className = "petal";
    el.style.cssText = `
      left: ${Math.random() * 100}vw;
      background: ${colors[i % colors.length]};
      width:  ${7 + Math.random() * 8}px;
      height: ${7 + Math.random() * 8}px;
      animation-duration: ${9 + Math.random() * 14}s;
      animation-delay:    ${Math.random() * 12}s;
    `;
    document.body.appendChild(el);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

// ── Manual navigation ─────────────────────────────────────────────────────────

function navigatePage(dir) {
  const total = totalPages();
  if (total <= 1) return;
  const next = (currentPage + dir + total) % total;
  transitionToPage(next);
  resetPageTimer(); // restart auto-rotate after manual nav
}

function updateNavButtons() {
  const total = totalPages();
  const prev = document.getElementById("nav-prev");
  const next = document.getElementById("nav-next");
  if (!prev || !next) return;
  if (total <= 1) {
    prev.disabled = true;
    next.disabled = true;
  } else {
    prev.disabled = false;
    next.disabled = false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  spawnPetals();
  poll();
  setInterval(poll, POLL_INTERVAL);

  // Click buttons
  document
    .getElementById("nav-prev")
    ?.addEventListener("click", () => navigatePage(-1));
  document
    .getElementById("nav-next")
    ?.addEventListener("click", () => navigatePage(1));

  // Keyboard: ← → Space
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      navigatePage(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigatePage(-1);
    }
  });

  // Scroll wheel (debounced)
  let wheelLock = false;
  document.addEventListener(
    "wheel",
    (e) => {
      if (wheelLock) return;
      wheelLock = true;
      setTimeout(() => {
        wheelLock = false;
      }, 600);
      navigatePage(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1);
    },
    { passive: true },
  );

  // Touch swipe
  let touchStartX = 0;
  document.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true },
  );
  document.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) navigatePage(dx < 0 ? 1 : -1);
  });
});
