// Envelope opening — one continuous GSAP timeline instead of chained
// setTimeouts, so every beat lands exactly where the previous one ends.
// Story: wax seal cracks → flap swings open (liner revealed by backface
// culling) → the letter rises from the pocket → the SAME card expands
// (GSAP Flip hero transition) into the readable personal letter → guest
// taps "เปิดการ์ดเชิญ" and the letter melts into the invitation page.
//
// onComplete(skipped) — skipped=true when the guest used the skip button.
// opts.scene     — optional 3D controller (envelope3d.js). When present it
//                  draws the envelope, flies the card onto the letter and
//                  dissolves the letter away; the DOM here keeps the tap
//                  target, the readable letter and all reading logic.
// opts.onClosing — called with { origin, growRadius } the moment the guest
//                  closes the letter (petal names start from there).
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { letterContent } from "./letter.js";
import { playCrack, playFlap, playSlide, preloadSfx } from "./sfx.js";
import { autoplayMusic } from "./music.js";
import { letterPaper, canvasURL } from "./paper.js";
import { writeTween, loadScriptFont } from "./handwriting.js";

gsap.registerPlugin(Flip);

const PARTICLE_COLORS = ["#f9c8d4", "#ed93b1", "#d4537e", "#c9b8e8"];

export function initEnvelope(onComplete, { scene = null, onClosing } = {}) {
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
  // Salutation + signature stay empty — the pen writes them when the
  // letter opens (script font loads meanwhile)
  if (bodyEl) bodyEl.textContent = content.body;
  loadScriptFont();

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
  if (!reduceMotion && !scene) {
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
  // nx, ny in roughly [-1, 1]: right / down positive
  function setTilt(nx, ny) {
    if (scene) return scene.setTilt(nx, ny);
    tiltY(gsap.utils.clamp(-10, 10, nx * 10));
    tiltX(gsap.utils.clamp(-8, 8, -ny * 8));
  }
  function onMove(e) {
    if (opened || e.pointerType !== "mouse") return;
    const r = body.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    setTilt(dx * 1.2, dy * 1.2);
  }
  // Touch: drag a finger to tilt the envelope (a drag never opens it —
  // the browser drops the click once the finger travels)
  let drag = null;
  function onDown(e) {
    if (opened || e.pointerType === "mouse") return;
    drag = { x: e.clientX, y: e.clientY };
  }
  function onDrag(e) {
    if (!drag || opened || e.pointerType === "mouse") return;
    setTilt((e.clientX - drag.x) / 110, (e.clientY - drag.y) / 110);
  }
  function onUp() {
    if (!drag) return;
    drag = null;
    setTilt(0, 0);
  }
  // Android tilts with the phone for free; iOS would need a permission
  // prompt (requestPermission) — deliberately never asked
  let gyro0 = null;
  function onOrient(e) {
    if (opened || drag || e.gamma == null) return;
    if (!gyro0) gyro0 = { g: e.gamma, b: e.beta };
    setTilt((e.gamma - gyro0.g) / 22, (e.beta - gyro0.b) / 22);
  }
  const hasGyro =
    "DeviceOrientationEvent" in window &&
    typeof DeviceOrientationEvent.requestPermission !== "function";
  if (!reduceMotion) {
    overlay.addEventListener("pointermove", onMove);
    overlay.addEventListener("pointerdown", onDown);
    overlay.addEventListener("pointermove", onDrag);
    overlay.addEventListener("pointerup", onUp);
    overlay.addEventListener("pointercancel", onUp);
    // pointer events keep flowing during a drag instead of turning into a pan
    overlay.style.touchAction = "none";
    if (hasGyro) window.addEventListener("deviceorientation", onOrient);
  }

  // Decode the foley while the guest looks at the envelope
  preloadSfx();

  // ── Letter sheet: smooth wedding card. The DOM letter and the WebGL
  // card draw the SAME generated canvases (paper.js), so the hand-off and
  // the dissolve are pixel-identical ──
  const sheen = document.createElement("span");
  sheen.className = "letter-sheen";
  sheen.setAttribute("aria-hidden", "true");
  letter.appendChild(sheen);
  let paperSize = "";
  function measureOpenLetter() {
    const probe = letter.cloneNode(true);
    probe.classList.add("env-letter--open");
    probe.style.cssText = "visibility:hidden;transform:none";
    probe.querySelector(".env-letter-inner")?.remove();
    overlay.appendChild(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    return r;
  }
  function applyLetterPaper(r) {
    const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (!r.width || key === paperSize) return;
    paperSize = key;
    // the couple's names pressed in foil at the top, e.g. "นนท์ & เมย์"
    const names =
      c?.groom_name && c?.bride_name ? `${c.groom_name} & ${c.bride_name}` : "";
    const paper = letterPaper(r.width, r.height, names);
    scene?.setLetterPaper(paper);
    Promise.all([canvasURL(paper.face), canvasURL(paper.shadow)]).then(
      ([face, shadow]) => {
        if (face) letter.style.setProperty("--letter-face", `url("${face}")`);
        if (shadow)
          letter.style.setProperty("--letter-shadow", `url("${shadow}")`);
      },
    );
  }
  // after webfonts settle — Thai line breaks decide the sheet's height
  document.fonts.ready.then(() => applyLetterPaper(measureOpenLetter()));

  // ── Letter tilt: the sheet leans toward the pointer / finger (Android
  // also follows the gyroscope), with a moving sheen and shadow ──
  const lt = { x: 0, y: 0 };
  function paintLetterTilt() {
    const st = letter.style;
    st.setProperty("--tilt-x", `${(-lt.y * 7).toFixed(2)}deg`);
    st.setProperty("--tilt-y", `${(lt.x * 9).toFixed(2)}deg`);
    st.setProperty("--sheen-x", `${(35 - lt.x * 45).toFixed(1)}%`);
    st.setProperty("--sheen-y", `${(20 - lt.y * 35).toFixed(1)}%`);
    st.setProperty("--shadow-dx", `${(lt.x * 7).toFixed(1)}px`);
    st.setProperty("--shadow-dy", `${(lt.y * 5).toFixed(1)}px`);
  }
  function letterTiltTo(x, y, duration = 0.6) {
    return gsap.to(lt, {
      x: gsap.utils.clamp(-1, 1, x),
      y: gsap.utils.clamp(-1, 1, y),
      duration,
      ease: "power2.out",
      overwrite: true,
      onUpdate: paintLetterTilt,
    });
  }
  let letterDrag = null;
  let letterGyro0 = null;
  function onLetterMove(e) {
    if (e.pointerType === "mouse") {
      const r = letter.getBoundingClientRect();
      letterTiltTo(
        (e.clientX - (r.left + r.width / 2)) / (r.width * 0.8),
        (e.clientY - (r.top + r.height / 2)) / (r.height * 0.8),
      );
    } else if (letterDrag) {
      letterTiltTo(
        (e.clientX - letterDrag.x) / 120,
        (e.clientY - letterDrag.y) / 120,
      );
    }
  }
  function onLetterDown(e) {
    if (e.pointerType !== "mouse") letterDrag = { x: e.clientX, y: e.clientY };
  }
  function onLetterUp() {
    if (!letterDrag) return;
    letterDrag = null;
    letterTiltTo(0, 0, 0.9);
  }
  function onLetterOrient(e) {
    if (letterDrag || e.gamma == null) return;
    if (!letterGyro0) letterGyro0 = { g: e.gamma, b: e.beta };
    letterTiltTo((e.gamma - letterGyro0.g) / 20, (e.beta - letterGyro0.b) / 20);
  }
  function wireLetterTilt(on) {
    if (reduceMotion) return;
    const fn = on ? "addEventListener" : "removeEventListener";
    overlay[fn]("pointermove", onLetterMove);
    overlay[fn]("pointerdown", onLetterDown);
    overlay[fn]("pointerup", onLetterUp);
    overlay[fn]("pointercancel", onLetterUp);
    if (hasGyro) window[fn]("deviceorientation", onLetterOrient);
    overlay.style.touchAction = on ? "none" : "";
  }

  // Skip affordance appears once the moment has had a chance to land
  if (skipBtn) gsap.to(skipBtn, { opacity: 1, duration: 0.5, delay: 1.4 });

  function finish(skipped) {
    overlay.style.display = "none";
    scene?.dispose();
    onComplete(skipped);
  }

  function teardownIdle() {
    overlay.removeEventListener("pointermove", onMove);
    overlay.removeEventListener("pointerdown", onDown);
    overlay.removeEventListener("pointermove", onDrag);
    overlay.removeEventListener("pointerup", onUp);
    overlay.removeEventListener("pointercancel", onUp);
    window.removeEventListener("deviceorientation", onOrient);
    overlay.style.touchAction = "";
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
    if (e.target === overlay) closeLetter(e);
  }

  // Where the dissolve starts: the tap, or the button for keyboard closes
  function closeOrigin(e) {
    if (e && e.detail > 0 && (e.clientX || e.clientY))
      return { x: e.clientX, y: e.clientY };
    const r = (continueBtn || letter).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function closeLetter(e) {
    if (closing) return;
    closing = true;
    document.removeEventListener("keydown", onLetterKeydown);
    overlay.removeEventListener("click", onOverlayTap);
    const origin = closeOrigin(e);
    wireLetterTilt(false);

    if (scene && !reduceMotion) {
      // the sheet settles flat first — the WebGL copy is drawn untilted
      letterTiltTo(0, 0, 0.18).then(() => {
        onClosing?.({ origin, growRadius: scene.growRadius });
        // WebGL repaints overlay + sheet and melts them away from the
        // tap; the DOM keeps only the text floating above, which fades out
        const rect = letter.getBoundingClientRect();
        const done = scene.dissolve(origin, rect);
        overlay.classList.add("env-dissolving");
        gsap.to(letter, { opacity: 0, duration: 0.45, ease: "power1.in" });
        gsap.to(overlay.querySelector(".env-controls"), {
          opacity: 0,
          duration: 0.3,
        });
        done.then(() => finish(false));
      });
      return;
    }

    onClosing?.({ origin });
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
    wireLetterTilt(true);
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

  // ── Letter text choreography: write → read → sign → stamp ──
  // Every step is a tween on one timeline, so revealTl.progress(1)
  // (tap-to-complete) finishes the handwriting instantly too.
  function completeReveal() {
    if (revealTl && !revealed) revealTl.progress(1);
  }

  function revealLetterText() {
    revealTl = gsap.timeline({
      onComplete: () => {
        revealed = true;
      },
    });
    revealTl
      // letterhead date settles in first
      .to(dateEl, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.4)
      // your name is written onto the paper in front of you, pen on paper
      .add(toEl ? writeTween(toEl, content.to) : gsap.timeline(), 0.7)
      // the message itself fades in as one readable block
      .to(bodyEl, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, ">")
      // ...and it is signed by hand
      .add(signEl ? writeTween(signEl, content.sign) : gsap.timeline(), ">+0.2")
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
        ">-0.05",
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
    if (signEl) signEl.textContent = content.sign;
    gsap.set([dateEl, bodyEl, continueBtn], { opacity: 1, y: 0 });
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
    // Sound: crack, then paper as the flap opens and the card slides out.
    // This tap is the user gesture iOS needs — music starts here and
    // swells in as the letter opens
    // (scheduled on the audio clock: iOS only unlocks audio synchronously
    // inside the tap, never from a setTimeout)
    playCrack(reduceMotion ? 0 : 0.16);
    if (!reduceMotion) {
      playFlap(0.45);
      playSlide(1.15);
    }
    autoplayMusic({ delay: reduceMotion ? 0 : 2.3 });

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

    if (scene) {
      openInScene();
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

  // 3D path: WebGL plays crack → flap → rise → card flight and lands the
  // card on the (still hidden) DOM letter's exact rect; then DOM takes over
  function openInScene() {
    letter.classList.add("env-letter--open");
    overlay.appendChild(letter);
    gsap.set(letterInner, { display: "none" });
    gsap.set(letter, { clearProps: "transform", zIndex: 9, visibility: "hidden" });
    const target = letter.getBoundingClientRect();
    applyLetterPaper(target); // no-op unless the layout changed since init
    gsap.to([label, skipBtn], { opacity: 0, duration: 0.4, delay: 0.15 });
    scene.open(target).then(() => {
      gsap.set(letter, { visibility: "visible" });
      scene.handOff();
      revealLetterText();
      wireReadingState();
    });
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
