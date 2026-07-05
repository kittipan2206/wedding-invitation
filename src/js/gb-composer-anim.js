// Guestbook composer choreography — the empty slot on the blessing board
// expands (hero transition) into a letter paper; on send, the paper flies
// down onto the board as the guest's own mini-letter card, and the wax
// stamp presses on (CSS animation on .gb-entry--new::after).
//
// All GSAP lives here so guestbook.js stays a plain, unit-testable module.
import gsap from "gsap";

function reduceMotion() {
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const els = () => ({
  composer: document.getElementById("gb-composer"),
  trigger: document.getElementById("gb-composer-trigger"),
  paper: document.querySelector(".gb-composer-paper"),
  backdrop: document.getElementById("gb-composer-backdrop"),
});

// Manual FLIP between two unrelated elements (slot ⇄ paper ⇄ card):
// start the target at the source's on-screen rect, animate home.
function flipFromRect(fromRect, el, { duration = 0.5, fade = true } = {}) {
  const to = el.getBoundingClientRect();
  return gsap.fromTo(
    el,
    {
      x: fromRect.left - to.left,
      y: fromRect.top - to.top,
      scaleX: fromRect.width / to.width,
      scaleY: fromRect.height / to.height,
      transformOrigin: "top left",
      opacity: fade ? 0.6 : 0.9,
    },
    {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      duration,
      ease: "power3.out",
      clearProps: "transform,opacity",
    },
  );
}

export function openComposer() {
  const { composer, trigger, paper, backdrop } = els();
  if (!composer || composer.classList.contains("open")) return;

  // NOTE: never toggle overflow on .snap-wrap here — hiding a scroll-snap
  // container's overflow makes it re-snap to the top when restored. The
  // backdrop's touch-action: none blocks background panning instead.
  composer.classList.add("open");
  composer.setAttribute("aria-hidden", "false");

  if (!reduceMotion() && trigger && paper) {
    flipFromRect(trigger.getBoundingClientRect(), paper, { duration: 0.45 });
    if (backdrop) {
      gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    }
  }
  setTimeout(
    () => document.getElementById("gb-message")?.focus(),
    reduceMotion() ? 0 : 460,
  );
}

export function closeComposer() {
  const { composer } = els();
  if (!composer?.classList.contains("open")) return;
  composer.classList.remove("open");
  composer.setAttribute("aria-hidden", "true");
}

// `card` is the guest's freshly written entry (already carries
// .gb-entry--new for the stamp-press animation). Prepends it to the feed
// and flies it from the composer paper's position onto the board.
export function playGuestbookSendAnimation(card, onDone) {
  const { composer, paper } = els();
  const feed = document.getElementById("guestbook-feed");
  if (!feed) {
    closeComposer();
    onDone();
    return;
  }

  const animated =
    !reduceMotion() && paper && composer?.classList.contains("open");
  const fromRect = animated ? paper.getBoundingClientRect() : null;

  feed.prepend(card);
  closeComposer();

  if (!animated) {
    onDone();
    return;
  }

  // The resting tilt uses a CSS transform transition — suspend it while
  // GSAP flies the card, then hand the transform back (clearProps)
  card.classList.add("gb-entry--flying");
  flipFromRect(fromRect, card, { duration: 0.6, fade: false }).then(() => {
    card.classList.remove("gb-entry--flying");
    onDone();
    // Layout above the feed just changed (thanks card replaced the slot),
    // so settle the view on the guest's own card — "there it is, on the
    // board" — instead of letting scroll-snap pick a spot
    setTimeout(() => {
      card.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
  });
}
