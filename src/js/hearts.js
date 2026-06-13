import gsap from "gsap";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

const FLUSH_DELAY_MS = 900;
const FLOAT_CHARS = ["❤️", "🩷", "💗", "💖", "💝", "🌸"];
const STORED_KEY = "hearts_sent_v1";
const MILESTONE_EVERY = 25;

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
  let sessionDisplay = 0; // current burst — resets on each idle

  // Restore filled state — collapse hint immediately on revisit
  if (localStorage.getItem(STORED_KEY) === "1") {
    btn.classList.add("heart-filled");
    if (hintEl) gsap.set(hintEl, { display: "none" });
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

  // Floating heart emoji — single per tap, GSAP-controlled
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

    el.style.cssText = `left:${cx - size / 2}px;top:${cy - size / 2}px;font-size:${size}px;`;
    document.body.appendChild(el);

    gsap.to(el, {
      keyframes: [
        {
          opacity: 1,
          scale: 1.25,
          x: driftX * 0.12,
          y: -riseY * 0.1,
          duration: 0.18,
          ease: "power2.out",
        },
        {
          opacity: 0.88,
          scale: 0.92,
          x: driftX * 0.6,
          y: -riseY * 0.55,
          duration: 0.42,
        },
        {
          opacity: 0,
          scale: 0.6,
          x: driftX,
          y: -riseY,
          duration: 0.52,
          ease: "power1.in",
        },
      ],
      onComplete: () => el.remove(),
    });
  }

  // Milestone number — big pop + float up every MILESTONE_EVERY session taps
  function spawnMilestoneFloat(n) {
    const bRect = btn.getBoundingClientRect();
    const cx = bRect.left + bRect.width / 2;
    const cy = bRect.top + bRect.height / 2;

    const el = document.createElement("span");
    el.className = "heart-float heart-milestone-float";
    el.setAttribute("aria-hidden", "true");
    el.textContent = String(n);

    el.style.cssText = `left:${cx - 24}px;top:${cy - 20}px;opacity:0;`;
    document.body.appendChild(el);

    const driftX = (Math.random() - 0.5) * 18;

    gsap.to(el, {
      keyframes: [
        {
          opacity: 1,
          scale: 1.8,
          y: -24,
          duration: 0.24,
          ease: "back.out(2.8)",
        },
        { scale: 1.1, duration: 0.14, ease: "power2.out" },
        {
          opacity: 0,
          scale: 0.7,
          y: -145,
          x: driftX,
          duration: 1.2,
          ease: "power2.out",
        },
      ],
      onComplete: () => el.remove(),
    });
  }

  // Hero fly — "+N" clone dives into the total counter with spring bounce on landing
  // Falls back to a direct sync update in test/server env (sessionCountWrap absent)
  function triggerHeroFly(displayCount) {
    if (!sessionCountWrap || !countEl) {
      if (heartsSupported && displayCount > 0 && countEl) {
        countEl.textContent = Number(countEl.textContent || 0) + displayCount;
      }
      return;
    }

    const scRect = sessionCountWrap.getBoundingClientRect();
    const cRect = countEl.getBoundingClientRect();

    // Kill any stale GSAP tweens on sessionCountEl (prevents stale "+0" reset)
    if (sessionCountEl) gsap.killTweensOf(sessionCountEl);

    // Spawn fixed clone — always use displayCount, never read DOM text (stale risk)
    const flyEl = document.createElement("div");
    flyEl.textContent = `+${displayCount}`;
    flyEl.setAttribute("aria-hidden", "true");
    Object.assign(flyEl.style, {
      position: "fixed",
      left: `${scRect.left + scRect.width / 2}px`,
      top: `${scRect.top + scRect.height / 2}px`,
      transform: "translate(-50%, -50%)",
      fontFamily: "var(--font-sans)",
      fontSize: "15px",
      fontWeight: "700",
      color: "#d4537e",
      zIndex: "9999",
      pointerEvents: "none",
    });
    document.body.appendChild(flyEl);

    // Reset session counter text immediately (before clone flies away)
    if (sessionCountEl) sessionCountEl.textContent = "+0";

    // Fade out original session counter via CSS transition
    sessionCountWrap.classList.remove("sc-active");

    const targetX =
      cRect.left + cRect.width / 2 - (scRect.left + scRect.width / 2);
    const targetY =
      cRect.top + cRect.height / 2 - (scRect.top + scRect.height / 2);

    // Arc left to avoid the heart button sitting between the two counters
    const arcX = targetX / 2 - 65;
    const arcY = targetY * 0.5;

    gsap
      .timeline()
      // Phase 1: sweep left and up (visible arc)
      // Phase 2: converge on counter and shrink to nothing
      .to(flyEl, {
        keyframes: [
          {
            x: arcX,
            y: arcY,
            scale: 1.15,
            opacity: 1,
            duration: 0.5,
            ease: "power1.out",
          },
          {
            x: targetX,
            y: targetY,
            scale: 0.25,
            opacity: 0,
            duration: 0.5,
            ease: "power2.in",
          },
        ],
      })
      // On landing: update value + spring bounce on counter
      .call(() => {
        flyEl.remove();
        if (heartsSupported && countEl) {
          const next = Number(countEl.textContent || 0) + displayCount;
          countEl.textContent = next;
        }
      })
      .fromTo(
        countEl,
        { scale: 1.55, color: "#d4537e" },
        {
          scale: 1,
          color: "#8a7f7a",
          duration: 0.65,
          ease: "elastic.out(1.3, 0.45)",
          clearProps: "color,scale",
        },
        "<",
      );
  }

  function flush() {
    const displayCount = sessionDisplay;
    sessionDisplay = 0;

    if (displayCount > 0) triggerHeroFly(displayCount);

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

  btn.addEventListener("click", () => {
    // Spring pop — CSS handles breathing; pop overrides during animation
    btn.classList.remove("heart-pop");
    void btn.offsetWidth;
    btn.classList.add("heart-pop");

    // Haptic pulse (Android)
    if (navigator.vibrate) navigator.vibrate([8, 20, 8]);

    // Filled state — on first tap, GSAP collapses the hint (eliminates gap)
    if (!btn.classList.contains("heart-filled")) {
      btn.classList.add("heart-filled");
      localStorage.setItem(STORED_KEY, "1");
      if (hintEl) {
        hintEl.classList.add("hidden");
        gsap.to(hintEl, {
          opacity: 0,
          height: 0,
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => gsap.set(hintEl, { display: "none" }),
        });
      }
    }

    // Single floating heart per tap
    spawnFloat();

    // Session tap counters
    sessionTaps++;
    sessionDisplay++;

    // Session counter: show "+N" with a little elastic pulse on each tap
    if (sessionCountEl) {
      sessionCountEl.textContent = "+" + sessionDisplay;
      gsap.fromTo(
        sessionCountEl,
        { scale: 1.38, color: "#c44469" },
        {
          scale: 1,
          color: "#d4537e",
          duration: 0.34,
          ease: "elastic.out(1.2, 0.5)",
        },
      );
    }
    if (sessionCountWrap) sessionCountWrap.classList.add("sc-active");

    // Dynamic milestone: every N taps, a large number pops up
    if (sessionTaps % MILESTONE_EVERY === 0) spawnMilestoneFloat(sessionTaps);

    // Schedule flush — handles hero animation + network send
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);

    if (!heartsSupported) return;
    pending++;
  });
}
