export function initPetals() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const colors = ["#F9C8D4", "#C9B8E8", "#B8E8D8", "#F8D8B8", "#B8D8F8"];
  const count = 18;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "petal-rain-particle";
    const size = 8 + Math.random() * 10;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const duration = 6 + Math.random() * 8;
    const delay = Math.random() * 8;

    el.style.cssText = `
      position: fixed;
      top: -20px;
      left: ${left}vw;
      width: ${size}px;
      height: ${size * 1.4}px;
      background: ${color};
      border-radius: 50% 50% 50% 0 / 60% 60% 40% 40%;
      opacity: 0;
      pointer-events: none;
      z-index: 1;
      animation: petalFall ${duration}s ${delay}s linear infinite;
    `;
    document.body.appendChild(el);
  }
}
