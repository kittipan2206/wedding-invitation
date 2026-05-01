export function initParallax() {
  if (window.matchMedia('(hover: none)').matches) return;

  const hero = document.getElementById('hero');
  if (!hero) return;

  const floralTop    = hero.querySelector('.floral-top');
  const floralBottom = hero.querySelector('.floral-bottom');
  if (!floralTop && !floralBottom) return;

  let tX = 0, tY = 0;   // target
  let cX = 0, cY = 0;   // current (lerped)

  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    tX = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
    tY = (e.clientY - r.top   - r.height / 2) / (r.height / 2);
  });

  hero.addEventListener('mouseleave', () => { tX = 0; tY = 0; });

  const D1 = 16; // floral-top depth (px)
  const D2 = 9;  // floral-bottom depth (px, opposite direction)

  function tick() {
    cX += (tX - cX) * 0.06;
    cY += (tY - cY) * 0.06;

    if (floralTop) {
      floralTop.style.setProperty('--px', `${cX * D1}px`);
      floralTop.style.setProperty('--py', `${cY * D1}px`);
    }
    if (floralBottom) {
      floralBottom.style.setProperty('--px', `${-cX * D2}px`);
      floralBottom.style.setProperty('--py', `${-cY * D2}px`);
    }
    requestAnimationFrame(tick);
  }
  tick();
}
