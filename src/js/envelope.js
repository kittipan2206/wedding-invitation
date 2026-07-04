// Envelope opening — one continuous GSAP timeline instead of chained
// setTimeouts, so every beat lands exactly where the previous one ends.
// Story: wax seal cracks → flap swings open (liner revealed by backface
// culling) → letter rises from the pocket → letter grows toward the viewer
// and melts into the page.
//
// onComplete(skipped) — skipped=true when the guest used the skip button;
// main.js then goes straight to the card without the letter interstitial.
import gsap from "gsap";

const PARTICLE_COLORS = ["#f9c8d4", "#ed93b1", "#d4537e", "#c9b8e8"];

export function initEnvelope(onComplete) {
  const overlay = document.getElementById("envelope-overlay");
  if (!overlay) {
    onComplete(false);
    return;
  }

  const body = overlay.querySelector(".envelope-body");
  // Motion target — the body itself stays still so the tap area is stable
  const stage = overlay.querySelector(".env-stage");
  const flap = overlay.querySelector(".env-flap");
  const linerShade = overlay.querySelector(".env-flap-shade");
  const letter = overlay.querySelector(".env-letter");
  const seal = overlay.querySelector(".env-seal");
  const particles = overlay.querySelector(".env-particles");
  const label = overlay.querySelector(".envelope-label");
  const skipBtn = document.getElementById("env-skip-btn");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // Letter card carries the couple names from live config
  const c = window.__weddingConfig;
  const namesEl = overlay.querySelector(".env-letter-names");
  if (namesEl && c?.groom_name && c?.bride_name) {
    namesEl.textContent = `${c.groom_name} & ${c.bride_name}`;
  }

  let opened = false;

  // ── Idle life: gentle float + seal breathing (transform-only = GPU) ──
  const idle = gsap.timeline({
    repeat: -1,
    yoyo: true,
    defaults: { ease: "sine.inOut" },
  });
  if (!reduceMotion) {
    idle
      .to(stage, { y: -6, duration: 1.9 }, 0)
      .to(seal, { scale: 1.06, duration: 1.9 }, 0);
  }

  // ── Pointer tilt: the envelope leans toward the cursor like a held object ──
  const tiltY = gsap.quickTo(stage, "rotationY", {
    duration: 0.6,
    ease: "power2.out",
  });
  const tiltX = gsap.quickTo(stage, "rotationX", {
    duration: 0.6,
    ease: "power2.out",
  });
  function onMove(e) {
    if (opened) return;
    const r = body.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    tiltY(gsap.utils.clamp(-10, 10, dx * 12));
    tiltX(gsap.utils.clamp(-8, 8, -dy * 10));
  }
  const canHover = window.matchMedia("(hover: hover)").matches;
  if (!reduceMotion && canHover) {
    overlay.addEventListener("pointermove", onMove);
  }

  // Skip affordance appears once the moment has had a chance to land
  if (skipBtn) gsap.to(skipBtn, { opacity: 1, duration: 0.5, delay: 1.4 });

  function finish(skipped) {
    overlay.style.display = "none";
    onComplete(skipped);
  }

  function teardownIdle() {
    overlay.removeEventListener("pointermove", onMove);
    idle.kill();
    body.style.cursor = "default";
    // CSS entrance animation holds opacity via fill-mode — release it so
    // the GSAP fade below actually wins
    if (label) label.style.animation = "none";
  }

  // ── Seal-crack particle burst ──
  function burstParticles() {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "env-particle";
      const size = 4 + Math.random() * 5;
      p.style.cssText = `left:138px;top:112px;width:${size}px;height:${size}px;background:${PARTICLE_COLORS[i % PARTICLE_COLORS.length]};`;
      particles.appendChild(p);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      gsap.fromTo(
        p,
        { x: 0, y: 0, scale: 1, opacity: 1 },
        {
          x: Math.cos(angle) * (40 + Math.random() * 30),
          y: Math.sin(angle) * (40 + Math.random() * 30) - 18,
          scale: 0.3,
          opacity: 0,
          duration: 0.55 + Math.random() * 0.25,
          ease: "power2.out",
          onComplete: () => p.remove(),
        },
      );
    }
  }

  function open() {
    if (opened) return;
    opened = true;
    teardownIdle();

    // Haptic tick on the seal crack (Android)
    if (navigator.vibrate) navigator.vibrate(10);

    if (reduceMotion) {
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.4,
        onComplete: () => finish(false),
      });
      return;
    }

    const tl = gsap.timeline({
      defaults: { force3D: true },
      onComplete: () => finish(false),
    });

    tl
      // settle any pointer tilt so the flap rotation reads clean
      .to(
        stage,
        {
          rotationX: 0,
          rotationY: 0,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      )
      // wax seal cracks
      .to(seal, { scale: 1.22, duration: 0.18, ease: "power2.out" }, 0)
      .add(burstParticles, 0.16)
      .to(
        seal,
        { scale: 0, opacity: 0, duration: 0.3, ease: "back.in(1.8)" },
        0.18,
      )
      .to([label, skipBtn], { opacity: 0, duration: 0.4 }, 0.15)
      // flap swings open about the fold line and flops back with a soft
      // settle: back.out overshoots past -160° (max ~-176°, safely short of
      // flat) then eases home — that bounce is what sells the paper fold.
      // Stopping at -160° keeps the opened flap slightly tilted, so
      // perspective foreshortens it and it still reads as 3D at rest.
      .to(
        flap,
        {
          rotationX: -160,
          transformOrigin: "50% 0%",
          duration: 1.15,
          ease: "back.out(1.4)",
        },
        0.45,
      )
      // the liner starts in shadow and brightens as the flap opens up
      .fromTo(
        linerShade,
        { opacity: 0.3 },
        { opacity: 0, duration: 0.7, ease: "power1.out" },
        0.85,
      )
      // once past vertical the flap tucks behind the letter
      .set(flap, { zIndex: 1 }, 0.82)
      // letter rises out of the pocket, unhurried, with a soft overshoot
      .to(letter, { y: -132, duration: 1.0, ease: "back.out(1.1)" }, 1.15)
      // once fully out, the letter sits above everything for the morph
      .set(letter, { zIndex: 8 }, 2.2)
      // a breath — let the guest actually read the card (0.6s hold),
      // then it grows toward the viewer and melts into the page
      .to(
        letter,
        {
          scale: 2.2,
          y: -75,
          opacity: 0,
          duration: 0.9,
          ease: "power2.inOut",
        },
        2.75,
      )
      .to(stage, { scale: 1.05, duration: 0.9, ease: "power2.inOut" }, 2.75)
      .to(overlay, { opacity: 0, duration: 0.8, ease: "power1.inOut" }, 3.0);
  }

  // role="button" divs don't fire click on Enter/Space — wire it manually
  function onKeydown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  }

  body.addEventListener("click", open);
  body.addEventListener("keydown", onKeydown);

  skipBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (opened) return;
    opened = true;
    teardownIdle();
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => finish(true),
    });
  });
}
