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

  // Recompute positions once async content settles — the hero photo loads
  // lazily and the envelope overlay may cover the viewport at init time.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  document.fonts?.ready?.then(refresh).catch(() => {});
  document
    .getElementById("hero-photo-img")
    ?.addEventListener("load", refresh, { once: true });
}
