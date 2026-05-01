export function burstConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9999;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const colors = [
    '#F9C8D4', '#C9B8E8', '#B8D8F8', '#B8E8D8',
    '#F8E8B8', '#F5C6EA', '#FFD700', '#FFFFFF',
  ];

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const particles = [];

  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    const isHeart = Math.random() < 0.15;
    particles.push({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy + (Math.random() - 0.5) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: Math.random() * 10 + 5,
      h: Math.random() * 5 + 3,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.1,
      alpha: 1,
      shape: isHeart ? 'heart' : (Math.random() < 0.4 ? 'circle' : 'rect'),
    });
  }

  function drawHeart(ctx, size) {
    const s = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.3, -s * 1.5, s * 0.8, 0, s * 1.4);
    ctx.bezierCurveTo(s * 1.5, s * 0.8, s, -s * 0.3, 0, s * 0.3);
    ctx.closePath();
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;

    for (const p of particles) {
      if (p.alpha <= 0) continue;
      alive++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.995;
      p.rotation += p.spin;
      p.alpha -= 0.004;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'heart') {
        drawHeart(ctx, p.w);
        ctx.fill();
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    if (alive > 0) requestAnimationFrame(loop);
    else canvas.remove();
  }

  loop();
}
