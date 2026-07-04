// Envelope opening — one continuous GSAP timeline instead of chained
// setTimeouts, so every beat lands exactly where the previous one ends.
// Story: wax seal cracks → flap swings open (liner revealed by backface
// culling) → the letter rises from the pocket → the SAME card expands
// (GSAP Flip hero transition) into the readable personal letter → guest
// taps "เปิดการ์ดเชิญ" and the letter melts into the invitation page.
//
// onComplete(skipped) — skipped=true when the guest used the skip button.
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { letterContent } from "./letter.js";

gsap.registerPlugin(Flip);

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
  const letterInner = overlay.querySelector(".env-letter-inner");
  const seal = overlay.querySelector(".env-seal");
  const particles = overlay.querySelector(".env-particles");
  const label = overlay.querySelector(".envelope-label");
  const skipBtn = document.getElementById("env-skip-btn");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // Personalize from live config: card monogram + letter text (?to= greeting)
  const c = window.__weddingConfig;
  const namesEl = overlay.querySelector(".env-letter-names");
  if (namesEl && c?.groom_name && c?.bride_name) {
    namesEl.textContent = `${c.groom_name} & ${c.bride_name}`;
  }
  const guestName = new URLSearchParams(window.location.search).get("to");
  const content = letterContent(c, guestName);
  const dateEl = overlay.querySelector(".letter-date");
  const toEl = overlay.querySelector(".letter-to");
  const bodyEl = overlay.querySelector(".letter-body");
  const signEl = overlay.querySelector(".letter-sign");
  const stampEl = overlay.querySelector(".letter-stamp");
  const continueBtn = overlay.querySelector(".letter-continue");
  // Letterhead date, top right — the wedding date, like a real letter
  if (dateEl && c?.event_date_display)
    dateEl.textContent = c.event_date_display;
  // Salutation stays empty — the typewriter writes it when the letter opens
  if (bodyEl) bodyEl.textContent = content.body;
  if (signEl) signEl.textContent = content.sign;

  let opened = false;
  let closing = false;
  let revealTl = null;
  let revealed = false;

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

  // ── Reading state: close the letter into the page ──
  function onLetterKeydown(e) {
    if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
      e.preventDefault();
      closeLetter();
    }
  }
  function onOverlayTap(e) {
    // Tapping outside the paper also continues — never trap the guest
    if (e.target === overlay) closeLetter();
  }

  function closeLetter() {
    if (closing) return;
    closing = true;
    document.removeEventListener("keydown", onLetterKeydown);
    overlay.removeEventListener("click", onOverlayTap);
    // The letter grows toward the viewer and melts into the invitation
    gsap
      .timeline({ onComplete: () => finish(false) })
      .to(
        letter,
        { scale: 1.15, opacity: 0, duration: 0.6, ease: "power2.in" },
        0,
      )
      .to(overlay, { opacity: 0, duration: 0.55, ease: "power1.inOut" }, 0.15);
  }

  function wireReadingState() {
    continueBtn?.addEventListener("click", closeLetter);
    overlay.addEventListener("click", onOverlayTap);
    document.addEventListener("keydown", onLetterKeydown);
    // Tapping the paper before the text has finished writing itself
    // completes everything instantly — the reveal never traps the reader.
    // Capture phase so it also intercepts the (still invisible) button.
    letter.addEventListener(
      "click",
      (e) => {
        if (revealed) return;
        e.stopPropagation();
        completeReveal();
      },
      true,
    );
  }

  // ── Letter text choreography: type → read → sign → stamp ──
  // Typewriter as a tween on a proxy index, so revealTl.progress(1)
  // (tap-to-complete) finishes it instantly with the full text.
  function typewriterTween(el, text, secondsPerChar = 0.05) {
    const chars = [...text]; // code-point order = Thai keyboard typing order
    const proxy = { i: 0 };
    return gsap.to(proxy, {
      i: chars.length,
      duration: chars.length * secondsPerChar,
      ease: "none",
      onUpdate: () => {
        el.textContent = chars.slice(0, Math.round(proxy.i)).join("");
      },
    });
  }

  function completeReveal() {
    if (revealTl && !revealed) revealTl.progress(1);
  }

  function revealLetterText() {
    revealTl = gsap.timeline({
      onComplete: () => {
        revealed = true;
        toEl?.classList.remove("typing");
      },
    });
    revealTl
      // letterhead date settles in first
      .to(dateEl, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.4)
      // your name is written onto the paper in front of you
      .call(() => toEl?.classList.add("typing"), null, 0.75)
      .add(typewriterTween(toEl, content.to), 0.75)
      .call(() => toEl?.classList.remove("typing"))
      // the message itself fades in as one readable block
      .to(bodyEl, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, ">")
      // the signature is signed, not typed — a pen stroke sweeping across
      .to(
        signEl,
        { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "power2.inOut" },
        ">+0.25",
      )
      // ...and the little wax stamp presses down beside it
      .fromTo(
        stampEl,
        { opacity: 0, scale: 1.8, rotation: -16 },
        {
          opacity: 1,
          scale: 1,
          rotation: -8,
          duration: 0.45,
          ease: "back.out(2.5)",
        },
        ">-0.1",
      )
      .to(
        continueBtn,
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        ">+0.15",
      );
  }

  // Reduced motion / instant paths show everything at once
  function showLetterTextInstant() {
    if (toEl) toEl.textContent = content.to;
    gsap.set([dateEl, bodyEl, continueBtn], { opacity: 1, y: 0 });
    if (signEl) gsap.set(signEl, { clipPath: "inset(0 0% 0 0)" });
    if (stampEl) gsap.set(stampEl, { opacity: 1, rotation: -8 });
    revealed = true;
  }

  // ── Hero transition: the risen card expands into the readable letter ──
  function expandLetter() {
    const state = Flip.getState(letter);
    letter.classList.add("env-letter--open");
    // Re-parent out of the 3D stage so the letter escapes the envelope's
    // perspective (and survives the stage sinking away underneath)
    overlay.appendChild(letter);
    gsap.set(letter, { clearProps: "transform", zIndex: 9 });
    Flip.from(state, {
      duration: 0.95,
      ease: "power3.inOut",
      absolute: true,
      props: "borderRadius",
    });
    // Monogram face gives way to the letter text (its own staggered
    // line reveals start as soon as the content becomes visible)
    gsap.to(letterInner, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => gsap.set(letterInner, { display: "none" }),
    });
    // The emptied envelope bows out beneath the growing letter
    gsap.to(stage, {
      y: 46,
      opacity: 0,
      scale: 0.94,
      duration: 0.85,
      ease: "power2.inOut",
    });
    revealLetterText();
    wireReadingState();
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
      // No theatrics — jump straight to the readable letter
      gsap.set(seal, { opacity: 0 });
      gsap.set([label, skipBtn], { opacity: 0 });
      gsap.set(flap, { rotationX: -160, transformOrigin: "50% 0%", zIndex: 1 });
      gsap.set(stage, { opacity: 0 });
      gsap.set(letterInner, { display: "none" });
      letter.classList.add("env-letter--open");
      overlay.appendChild(letter);
      gsap.set(letter, { clearProps: "transform", zIndex: 9 });
      showLetterTextInstant();
      wireReadingState();
      return;
    }

    const tl = gsap.timeline({ defaults: { force3D: true } });

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
      .set(letter, { zIndex: 8 }, 2.2)
      // a small beat, then the card expands into the readable letter —
      // the guest closes it themselves with the "เปิดการ์ดเชิญ" button
      .add(expandLetter, 2.35);
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
