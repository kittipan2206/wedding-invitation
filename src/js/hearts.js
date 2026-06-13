const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

const FLUSH_DELAY_MS = 900;
const FLOAT_CHARS = ["❤️", "🩷", "💗", "💖", "💝", "🌸"];
const STORED_KEY = "hearts_sent_v1";

// IMPORTANT: the POST fires ONLY after GET ?type=hearts confirms the backend
// supports hearts. The GAS doPost treats any unrecognized POST as an RSVP
// (blank row + Telegram notification), so an unguarded send is NOT harmless.
export function initHearts() {
  const btn = document.getElementById("send-heart-btn");
  if (!btn) return;

  const countEl = document.getElementById("heart-count");
  const countWrap = document.querySelector(".heart-count-wrap");
  const hintEl = document.getElementById("heart-hint");
  const sessionCountEl = document.getElementById("session-count");
  const sessionCountWrap = document.getElementById("session-counter-wrap");

  let heartsSupported = false;
  let pending = 0;
  let flushTimer = null;
  let sessionTaps = 0; // cumulative this session — never resets (drives milestone)
  let sessionDisplay = 0; // current burst — resets after each idle period

  // Restore filled state from previous visit
  if (localStorage.getItem(STORED_KEY) === "1") {
    btn.classList.add("heart-filled");
    if (hintEl) hintEl.classList.add("hidden");
  }

  // Capability probe — backend must answer {count: N} to unlock sending
  fetch(`${SHEET_URL}?type=hearts`, { redirect: "follow" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && typeof data.count === "number") {
        heartsSupported = true;
        if (countEl) countEl.textContent = data.count;
        if (countWrap) countWrap.style.display = "inline";
      }
    })
    .catch(() => {});

  // Animate "+N" flying from session counter down to total counter
  function startFlyAnimation() {
    if (!sessionCountWrap || !countEl) return;
    const scRect = sessionCountWrap.getBoundingClientRect();
    const cRect = countEl.getBoundingClientRect();
    const dy = cRect.top + cRect.height / 2 - (scRect.top + scRect.height / 2);
    sessionCountWrap.style.setProperty("--hero-dy", `${dy}px`);
    sessionCountWrap.classList.remove("sc-flying");
    void sessionCountWrap.offsetWidth;
    sessionCountWrap.classList.add("sc-flying");
  }

  // Rapid taps batch into one POST — also drives session counter hero animation
  function flush() {
    const displayCount = sessionDisplay;
    sessionDisplay = 0;

    if (heartsSupported && displayCount > 0 && countEl) {
      // Update total counter immediately (data correctness + test compatibility)
      const next = Number(countEl.textContent || 0) + displayCount;
      countEl.textContent = next;
      // Delay bump to visually align with hero fly landing (~280ms into 500ms animation)
      setTimeout(() => {
        countEl.classList.remove("heart-count-bump");
        void countEl.offsetWidth;
        countEl.classList.add("heart-count-bump");
      }, 280);
      startFlyAnimation();
    } else if (displayCount > 0 && sessionCountWrap) {
      sessionCountWrap.classList.remove("sc-active");
    }

    // Clean up session counter after animation completes
    if (displayCount > 0) {
      setTimeout(() => {
        if (sessionCountWrap)
          sessionCountWrap.classList.remove("sc-active", "sc-flying");
        if (sessionCountEl) sessionCountEl.textContent = "+0";
      }, 600);
    }

    // Network — only if supported and there are pending taps
    if (!pending) return;
    const count = pending;
    pending = 0;
    fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "heart", count }),
    }).catch(() => {});
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearTimeout(flushTimer);
      flush();
    }
  });

  // Floating heart emoji — fixed position, appended to body so nothing clips it
  function spawnFloat() {
    const bRect = btn.getBoundingClientRect();
    const cx = bRect.left + bRect.width / 2;
    const cy = bRect.top + bRect.height / 2;

    const el = document.createElement("span");
    el.className = "heart-float";
    el.setAttribute("aria-hidden", "true");
    el.textContent =
      FLOAT_CHARS[Math.floor(Math.random() * FLOAT_CHARS.length)];

    const size = 18 + Math.random() * 10;
    const driftX = (Math.random() - 0.5) * 60;
    const riseY = 100 + Math.random() * 70;
    const dur = 1.2 + Math.random() * 0.5;

    el.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;font-size:${size}px;animation-duration:${dur}s;--hf-dx:${driftX}px;--hf-dy:${-riseY}px;`;
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // Milestone number floats up from heart center (every 5 session taps)
  function spawnMilestoneFloat(n) {
    const bRect = btn.getBoundingClientRect();
    const cx = bRect.left + bRect.width / 2;
    const cy = bRect.top + bRect.height / 2;

    const el = document.createElement("span");
    el.className = "heart-float heart-milestone-float";
    el.setAttribute("aria-hidden", "true");
    el.textContent = String(n);

    const driftX = (Math.random() - 0.5) * 20;
    const riseY = 120 + Math.random() * 30;

    el.style.cssText = `left:${cx - 20}px;top:${cy - 16}px;animation-duration:1.6s;--hf-dx:${driftX}px;--hf-dy:${-riseY}px;`;
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  btn.addEventListener("click", () => {
    // Spring pop — higher specificity on .heart-tap-btn.heart-pop .heart-svg overrides breathe
    btn.classList.remove("heart-pop");
    void btn.offsetWidth;
    btn.classList.add("heart-pop");

    // Haptic pulse (Android)
    if (navigator.vibrate) navigator.vibrate([8, 20, 8]);

    // Filled state + hide hint on first tap ever
    if (!btn.classList.contains("heart-filled")) {
      btn.classList.add("heart-filled");
      localStorage.setItem(STORED_KEY, "1");
      if (hintEl) hintEl.classList.add("hidden");
    }

    // Exactly one floating heart per tap
    spawnFloat();

    // Session tap counters
    sessionTaps++;
    sessionDisplay++;

    // Update session counter "+N" display
    if (sessionCountEl) sessionCountEl.textContent = "+" + sessionDisplay;
    if (sessionCountWrap) {
      sessionCountWrap.classList.remove("sc-flying"); // cancel any in-flight animation
      sessionCountWrap.classList.add("sc-active");
    }

    // Dynamic milestone: every 5 session taps, float the count as a number
    if (sessionTaps % 5 === 0) spawnMilestoneFloat(sessionTaps);

    // Schedule flush — handles both visual hero animation and network send
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);

    if (!heartsSupported) return;
    pending++;
  });
}
