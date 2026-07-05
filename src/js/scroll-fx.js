import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Scroll-linked depth on the hero. As you scroll away from the first screen the
// couple photo drifts up and zooms slightly slower than the page, while the
// bottom florals drift the opposite way — a layered parallax that adds depth.
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
  const floralBottom = hero.querySelector(".floral-bottom");

  gsap
    .timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
      },
    })
    .to(photo, { y: -64, scale: 1.06, ease: "none" }, 0)
    .to(floralBottom, { y: 44, ease: "none" }, 0);

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

  // Detail cards: the wrapper drifts as one sheet, the icons a touch more
  drift(document.querySelector(".details-cards"), 16);
  gsap.utils
    .toArray(".detail-card-icon")
    .forEach((el, i) => drift(el, 6 + (i % 3) * 4));

  // Guestbook feed rises slightly faster than the page
  drift(document.getElementById("guestbook-feed"), 14);

  // Gallery tiles float at alternating depths. gallery.js replaces the
  // grid's children once real photos arrive, so the drifts are (re)bound
  // to whatever the current children are, via a MutationObserver.
  const galleryGrid = document.getElementById("gallery-preview-grid");
  if (galleryGrid) {
    let galleryTweens = [];
    const bindGalleryDrift = () => {
      galleryTweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
      galleryTweens = Array.from(galleryGrid.children).map((el, i) => {
        const mag = 8 + (i % 3) * 6;
        return gsap.fromTo(
          el,
          { y: mag },
          {
            y: -mag,
            ease: "none",
            scrollTrigger: {
              trigger: galleryGrid.closest("section"),
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
      });
    };
    bindGalleryDrift();
    new MutationObserver(bindGalleryDrift).observe(galleryGrid, {
      childList: true,
    });
  }

  // Divider ornaments slowly pinwheel as they pass
  gsap.utils.toArray(".floral-divider-ornament").forEach((el) => {
    const section = el.closest("section");
    if (!section) return;
    gsap.fromTo(
      el,
      { rotation: -40 },
      {
        rotation: 40,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      },
    );
  });

  // Recompute positions once async content settles — the hero photo loads
  // lazily and the envelope overlay may cover the viewport at init time.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  document.fonts?.ready?.then(refresh).catch(() => {});
  document
    .getElementById("hero-photo-img")
    ?.addEventListener("load", refresh, { once: true });
}
