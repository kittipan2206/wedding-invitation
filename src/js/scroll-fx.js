import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Scroll-linked depth on the hero. As you scroll away from the first screen the
// couple photo drifts up and zooms slightly slower than the page — a layered
// parallax that adds depth.
//
// The site scrolls inside the scroll-snap container (.snap-wrap), not the
// window, so ScrollTrigger is pointed at that element as its scroller. The
// effect is skipped entirely for users who prefer reduced motion.
export function initScrollFX() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const scroller = document.querySelector(".snap-wrap");
  const hero = document.getElementById("hero");
  if (!scroller || !hero) return;

  ScrollTrigger.defaults({ scroller });

  const photo = document.querySelector(".hero-photo");

  gsap
    .timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
      },
    })
    .to(photo, { y: -64, scale: 1.06, ease: "none" }, 0);

  // ── Section parallax: decorative elements drift on their own layers ──
  // IMPORTANT: never target `.reveal` elements — their entrance uses a CSS
  // transform transition, and a GSAP inline transform would fight it. Only
  // wrappers and children of reveals are safe.
  //
  // `mag` is half the total travel: the element starts `mag` px low and
  // ends `mag` px high as its section crosses the viewport.
  function drift(el, mag) {
    if (!el) return;
    const section = el.closest("section");
    if (!section) return;
    gsap.fromTo(
      el,
      { y: mag },
      {
        y: -mag,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      },
    );
  }

  // Countdown digits float at alternating depths
  gsap.utils
    .toArray(".countdown-grid .countdown-unit")
    .forEach((el, i) => drift(el, 10 + (i % 2) * 8));

  // Details insert drifts as one sheet
  drift(document.querySelector(".details-cards"), 16);

  // Guestbook feed rises slightly faster than the page
  drift(document.getElementById("guestbook-feed"), 14);

  // Gallery polaroids lie flat on the linen table and stand up one after
  // another as the section scrolls in (the resting tilt matches the CSS
  // nth-child tilt). gallery.js replaces the grid's children once real
  // photos arrive, so the tweens are (re)bound to whatever the current
  // children are, via a MutationObserver.
  const galleryGrid = document.getElementById("gallery-preview-grid");
  if (galleryGrid) {
    let galleryTweens = [];
    const bindGalleryRise = () => {
      galleryTweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
      galleryTweens = Array.from(galleryGrid.children).map((el, i) =>
        gsap.fromTo(
          el,
          {
            rotationX: 64,
            rotation: (i % 2 ? 7 : -9) + (i % 3) * 2,
            y: 36,
            transformPerspective: 700,
            transformOrigin: "50% 100%",
          },
          {
            rotationX: 0,
            rotation: i % 2 ? 1.6 : -2,
            y: 0,
            ease: "power1.out",
            scrollTrigger: {
              trigger: galleryGrid,
              start: `top ${98 - i * 5}%`,
              end: `top ${62 - i * 2}%`, // all upright by the time it snaps
              scrub: 0.6,
            },
          },
        ),
      );
    };
    bindGalleryRise();
    new MutationObserver(bindGalleryRise).observe(galleryGrid, {
      childList: true,
    });
  }

  // Recompute positions once async content settles — the hero photo loads
  // lazily and the envelope overlay may cover the viewport at init time.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  document.fonts?.ready?.then(refresh).catch(() => {});
  document
    .getElementById("hero-photo-img")
    ?.addEventListener("load", refresh, { once: true });
}
