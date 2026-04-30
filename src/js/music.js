export function initMusic() {
  const btn = document.getElementById('music-btn');
  if (!btn) return;

  let ctx = null;
  let gainNode = null;
  let oscillators = [];
  let playing = false;

  const noteIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 15V5l9-2v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="15" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="14.5" cy="13" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;
  const playIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 5l9-2v10M7 15V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="4.5" cy="15" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="13.5" cy="13" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;

  btn.innerHTML = noteIcon;

  function startMusic() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
    gainNode.connect(ctx.destination);

    const freqs = [261.63, 329.63, 392.00];
    const detunes = [0, 5, -5];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detunes[i];
      osc.connect(gainNode);
      osc.start();
      oscillators.push(osc);
    });
  }

  function stopMusic() {
    if (!ctx) return;
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    setTimeout(() => {
      oscillators.forEach(o => o.stop());
      oscillators = [];
      ctx.close();
      ctx = null;
    }, 1000);
  }

  btn.addEventListener('click', () => {
    playing = !playing;
    if (playing) {
      startMusic();
      btn.innerHTML = playIcon;
      btn.classList.add('is-playing');
    } else {
      stopMusic();
      btn.innerHTML = noteIcon;
      btn.classList.remove('is-playing');
    }
  });
}
