export function initMusic() {
  const btn = document.getElementById('music-btn');
  if (!btn) return;

  const audio = new Audio('/music/wedding-music.mp3');
  audio.loop = true;
  audio.volume = 0;

  const noteIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 15V5l9-2v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="15" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="13" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;
  const pauseIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="5" y="4" width="3" height="12" rx="1" fill="currentColor"/><rect x="12" y="4" width="3" height="12" rx="1" fill="currentColor"/></svg>`;

  btn.innerHTML = noteIcon;

  function fadeTo(target, duration = 1500) {
    const start = audio.volume;
    const diff = target - start;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      audio.volume = start + diff * t;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  btn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      fadeTo(0.55);
      btn.innerHTML = pauseIcon;
      btn.classList.add('is-playing');
    } else {
      fadeTo(0, 800);
      setTimeout(() => audio.pause(), 850);
      btn.innerHTML = noteIcon;
      btn.classList.remove('is-playing');
    }
  });
}
