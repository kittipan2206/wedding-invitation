export function initScrollNav() {
  const sections = ['hero', 'countdown', 'details', 'rsvp'];
  const labels = ['เริ่มต้น', 'นับถอยหลัง', 'รายละเอียด', 'RSVP'];

  const nav = document.createElement('nav');
  nav.className = 'scroll-nav';
  nav.setAttribute('aria-label', 'ไปยัง section');

  const dots = sections.map((id, i) => {
    const dot = document.createElement('button');
    dot.className = 'scroll-nav-dot';
    dot.setAttribute('aria-label', labels[i]);
    dot.addEventListener('click', () => {
      const target = document.getElementById(id);
      const wrap = document.querySelector('.snap-wrap');
      if (target && wrap) wrap.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    });
    nav.appendChild(dot);
    return dot;
  });

  document.body.appendChild(nav);

  const els = sections.map(id => document.getElementById(id)).filter(Boolean);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const i = els.indexOf(entry.target);
        dots.forEach((d, j) => d.classList.toggle('active', j === i));
      }
    });
  }, { threshold: 0.5 });

  els.forEach(el => observer.observe(el));
}
