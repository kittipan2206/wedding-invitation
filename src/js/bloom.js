// Flower-bloom burst — softer, slower cousin of confetti.js. Petals drift up
// from the origin then float down like falling blossoms. Used when a guest
// sends a blessing or a heart, so the moment feels acknowledged.

const PETAL_COLORS = ["#F9C8D4", "#C9B8E8", "#B8D8F8", "#B8E8D8", "#F8D8B8"];

export function burstBloom(originX, originY) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;top:0;left:0;pointer-events:none;z-index:9999;";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const cx = originX ?? canvas.width / 2;
  const cy = originY ?? canvas.height / 2;
  const particles = [];

  for (let i = 0; i < 36; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = Math.random() * 4 + 2.5;
    particles.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      size: Math.random() * 7 + 5,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.08,
      sway: Math.random() * Math.PI * 2,
      alpha: 1,
      heart: Math.random() < 0.2,
    });
  }

  function drawPetal(size) {
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.45, size, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHeart(size) {
    const s = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.3, -s * 1.5, s * 0.8, 0, s * 1.4);
    ctx.bezierCurveTo(s * 1.5, s * 0.8, s, -s * 0.3, 0, s * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;

    for (const p of particles) {
      if (p.alpha <= 0) continue;
      alive++;
      p.sway += 0.05;
      p.x += p.vx + Math.sin(p.sway) * 0.6;
      p.y += p.vy;
      p.vy += 0.05; // gentle gravity — petals fall slowly
      p.vx *= 0.99;
      p.rotation += p.spin;
      p.alpha -= 0.006;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (p.heart) drawHeart(p.size);
      else drawPetal(p.size);
      ctx.restore();
    }

    if (alive > 0) requestAnimationFrame(loop);
    else canvas.remove();
  }

  loop();
}
