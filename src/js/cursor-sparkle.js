export function initCursorSparkle() {
  // Skip on touch-only devices
  if (window.matchMedia('(hover: none)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;top:0;left:0;pointer-events:none;z-index:9998;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const colors = ['#F9C8D4', '#C9B8E8', '#B8E8D8', '#B8D8F8', '#F5E6C8', '#E8C8F0'];
  const particles = [];

  let frame = 0;
  document.addEventListener('mousemove', e => {
    frame++;
    if (frame % 2 !== 0) return; // spawn every other event to reduce density
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.9 + 0.3;
      particles.push({
        x: e.clientX,
        y: e.clientY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        r: Math.random() * 4 + 2,
        alpha: 0.75,
        decay: Math.random() * 0.012 + 0.010,
        color: colors[Math.floor(Math.random() * colors.length)],
        spikes: Math.random() < 0.5 ? 4 : 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.07,
      });
    }
  });

  function drawStar(x, y, spikes, outerR, innerR, rotation) {
    const step = Math.PI / spikes;
    let rot = rotation - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(rot) * outerR, y + Math.sin(rot) * outerR);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      ctx.lineTo(x + Math.cos(rot) * innerR, y + Math.sin(rot) * innerR);
      rot += step;
      ctx.lineTo(x + Math.cos(rot) * outerR, y + Math.sin(rot) * outerR);
    }
    ctx.closePath();
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02; // gentle gravity
      p.r *= 0.965;
      p.alpha -= p.decay;
      p.rotation += p.spin;
      if (p.alpha <= 0 || p.r < 0.6) { particles.splice(i, 1); continue; }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      drawStar(p.x, p.y, p.spikes, p.r, p.r * 0.4, p.rotation);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(loop);
  }
  loop();
}
