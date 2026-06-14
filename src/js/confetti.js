import confetti from "canvas-confetti";

// Pastel wedding palette (matches the site's CSS custom properties)
const PALETTE = [
  "#F9C8D4",
  "#C9B8E8",
  "#B8D8F8",
  "#B8E8D8",
  "#F8E8B8",
  "#F5C6EA",
  "#FFD700",
];

// Celebratory burst on RSVP success. Backed by canvas-confetti for richer
// physics (gravity, drift, shapes) than the old hand-rolled loop. The export
// name is unchanged so callers (rsvp.js) and the test mock keep working.
export function burstConfetti() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Dedicated high z-index canvas so confetti sits above the thank-you overlay
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
  document.body.appendChild(canvas);

  let fire;
  try {
    fire = confetti.create(canvas, { resize: true, useWorker: false });
  } catch {
    canvas.remove();
    return;
  }

  const heart =
    typeof confetti.shapeFromText === "function"
      ? confetti.shapeFromText({ text: "❤️", scalar: 2 })
      : null;

  const base = { colors: PALETTE, disableForReducedMotion: true };

  // Center pop
  fire({
    ...base,
    particleCount: 80,
    spread: 75,
    startVelocity: 45,
    origin: { y: 0.62 },
  });
  // Two side cannons angled inward
  fire({
    ...base,
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.7 },
  });
  fire({
    ...base,
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.7 },
  });
  // Heart accents drifting through the burst
  if (heart) {
    fire({
      ...base,
      particleCount: 16,
      spread: 100,
      startVelocity: 38,
      scalar: 1.4,
      shapes: [heart],
      origin: { y: 0.55 },
    });
  }

  // Remove the canvas once the animation has settled
  setTimeout(() => canvas.remove(), 3500);
}
