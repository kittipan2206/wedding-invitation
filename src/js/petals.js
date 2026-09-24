// A few real-looking petals drifting down behind the page — quiet, not confetti.
const PETAL_SVG = `<svg viewBox="0 0 12 16" aria-hidden="true"><path d="M6 15.5C1.6 11.8.6 6.9 3 2.4 3.8.9 5 .6 6 2.2 7 .6 8.2.9 9 2.4c2.4 4.5 1.4 9.4-3 13.1Z" fill="currentColor"/><path d="M6 14.2V5.4" stroke="#fff" stroke-opacity=".45" stroke-width=".5" fill="none"/></svg>`;

export function initPetals() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const colors = ["#f3b9c8", "#f8d8b8", "#e9c9d6"];
  const count = 5;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "petal-rain-particle";
    el.innerHTML = PETAL_SVG;
    const size = 9 + Math.random() * 5;
    el.style.cssText = `
      left: ${5 + Math.random() * 90}vw;
      width: ${size}px;
      height: ${size * 1.33}px;
      color: ${colors[i % colors.length]};
      --petal-max-opacity: ${0.35 + Math.random() * 0.15};
      animation-duration: ${18 + Math.random() * 10}s;
      animation-delay: ${i * 4 + Math.random() * 3}s;
    `;
    el.firstChild.style.animationDelay = `${-Math.random() * 3}s`;
    document.body.appendChild(el);
  }
}
