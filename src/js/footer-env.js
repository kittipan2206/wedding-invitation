// Bookend: the page closes the way it opened. When the footer scrolls in,
// a small envelope waits open, the letter slides back in, the flap folds
// shut, the wax seal stamps it, and a handwritten farewell writes itself.
// Same component classes as the opening + RSVP envelopes.
import gsap from "gsap";
import { CONFIG_DEFAULTS } from "./config.js";
import { getCountdownPhase } from "./countdown.js";
import { loadScriptFont, writeTween } from "./handwriting.js";
import { salutation } from "./letter.js";

const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function farewellLine(iso, now = new Date()) {
  const phase = getCountdownPhase(iso, now);
  if (phase === "ended") return "ขอบคุณที่มาร่วมงานของเรา ♡";
  if (phase === "day-of") return "แล้วพบกันวันนี้นะ ♡";
  const [, m, d] = iso.split("-").map(Number);
  return `แล้วพบกันวันที่ ${d} ${TH_MONTHS[m - 1]} ♡`;
}

export function initFooterEnvelope() {
  const env = document.getElementById("footer-env");
  const line = document.getElementById("footer-farewell");
  if (!env || !line) return;

  const cfg = { ...CONFIG_DEFAULTS, ...window.__weddingConfig };
  const iso = cfg.event_date_iso;
  const names = env.querySelector(".env-letter-names");
  if (names) names.textContent = `${cfg.groom_name} & ${cfg.bride_name}`;
  const text = farewellLine(iso);
  const to = salutation(new URLSearchParams(location.search).get("to"));
  const toEl = env.querySelector(".env-to");
  if (toEl && to) {
    toEl.textContent = to;
    toEl.style.display = "block";
  }

  // the sealed envelope is the "open it again" control
  const reopen = () => document.getElementById("replay-envelope-btn")?.click();
  env.addEventListener("click", reopen);
  env.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    reopen();
  });

  const reduceMotion =
    typeof IntersectionObserver === "undefined" ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    line.textContent = text; // already sealed (the CSS resting state)
    return;
  }

  const flap = env.querySelector(".env-flap");
  const seal = env.querySelector(".env-seal");
  const letter = env.querySelector(".env-letter");
  // waiting open, letter half out — ready to be put away
  gsap.set(flap, { rotationX: -160, transformOrigin: "50% 0%", zIndex: 1 });
  gsap.set(seal, { scale: 0, opacity: 0 });
  gsap.set(letter, { y: -96 });
  loadScriptFont();

  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      gsap
        .timeline({ defaults: { force3D: true } })
        .to(letter, { y: 0, duration: 0.7, ease: "power2.inOut" }, 0.2)
        .set(flap, { zIndex: 5 }, 0.8)
        .to(flap, { rotationX: 0, duration: 0.7, ease: "power3.inOut" }, 0.85)
        .fromTo(
          seal,
          { scale: 1.8, opacity: 0, rotation: -14 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.4, ease: "back.out(2.5)" },
          1.6,
        )
        .add(() => navigator.vibrate?.(10), 1.75)
        // measured now, when the line is laid out and the font is in
        .add(() => writeTween(line, text), 2.1);
    },
    { threshold: 0.6 },
  );
  io.observe(env);
}
