import './styles/main.css';
import { initEnvelope }  from './js/envelope.js';
import { initPetals }    from './js/petals.js';
import { initCountdown } from './js/countdown.js';
import { initReveal }    from './js/reveal.js';
import { initRsvp }      from './js/rsvp.js';
import { initMusic }     from './js/music.js';
import { initScrollNav } from './js/scroll-nav.js';
import { initShare }     from './js/share.js';

function afterEnvelope() {
  initPetals();
  initMusic();
  const musicBtn = document.getElementById('music-btn');
  if (musicBtn) musicBtn.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  // Guest name personalization
  const params = new URLSearchParams(window.location.search);
  const guestName = params.get('to');
  if (guestName) {
    const greet = document.querySelector('.guest-greeting');
    const nameEl = document.querySelector('.guest-name');
    if (greet && nameEl) {
      nameEl.textContent = guestName;
      greet.style.display = 'block';
    }
    document.title = `${guestName} — นนท์ & เมย์ Wedding Invitation`;
  }

  initCountdown();
  initReveal();
  initRsvp();
  initScrollNav();
  initShare();
  initEnvelope(afterEnvelope);
});
