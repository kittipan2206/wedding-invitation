// "Mail the reply" — after the guest submits the RSVP, the form paper
// shrinks away, a small envelope appears, the letter slides inside, the
// flap folds shut, the wax seal stamps it closed, and the envelope flies
// off toward the couple. Same motifs (and component classes) as the
// opening envelope, played in reverse.
//
// All GSAP lives here so rsvp.js stays a plain, unit-testable form module.
import gsap from "gsap";

export function playRsvpSendAnimation(onDone) {
  const formCard = document.querySelector(".rsvp-form");
  const env = document.getElementById("rsvp-send-env");

  // No matchMedia (e.g. jsdom in unit tests) → treat as reduced motion
  const reduceMotion =
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!formCard || !env || reduceMotion) {
    onDone();
    return;
  }

  const flap = env.querySelector(".env-flap");
  const seal = env.querySelector(".env-seal");
  const letter = env.querySelector(".env-letter");

  // Start state: envelope waiting open, letter half out of the pocket,
  // no seal yet — ready to receive the reply
  gsap.set(env, { opacity: 0, y: 28, scale: 0.9 });
  gsap.set(flap, { rotationX: -160, transformOrigin: "50% 0%", zIndex: 1 });
  gsap.set(seal, { scale: 0, opacity: 0 });
  gsap.set(letter, { y: -96 });

  gsap
    .timeline({
      defaults: { force3D: true },
      onComplete: () => {
        // Hand the card back in a clean state, then let the thank-you
        // content (swapped in by onDone) fade up in its place
        gsap.set(formCard, { clearProps: "transform,opacity" });
        onDone();
        gsap.from(formCard, {
          opacity: 0,
          y: 14,
          duration: 0.5,
          ease: "power2.out",
          clearProps: "all",
        });
      },
    })
    // the reply paper shrinks toward the envelope...
    .to(
      formCard,
      { scale: 0.42, y: 40, opacity: 0, duration: 0.65, ease: "power2.in" },
      0,
    )
    // ...which rises to meet it
    .to(
      env,
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out" },
      0.4,
    )
    // the letter slides down into the pocket
    .to(letter, { y: 0, duration: 0.55, ease: "power2.inOut" }, 0.85)
    // flap folds shut over it (reverse of the opening)
    .set(flap, { zIndex: 5 }, 1.3)
    .to(flap, { rotationX: 0, duration: 0.7, ease: "power3.inOut" }, 1.35)
    // wax seal stamps it closed
    .fromTo(
      seal,
      { scale: 1.8, opacity: 0, rotation: -14 },
      {
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: 0.4,
        ease: "back.out(2.5)",
      },
      2.1,
    )
    // a happy little wiggle...
    .to(
      env,
      {
        rotation: 2.5,
        duration: 0.11,
        yoyo: true,
        repeat: 3,
        ease: "sine.inOut",
      },
      2.6,
    )
    // ...and off it flies to the couple
    .to(
      env,
      {
        x: 150,
        y: -280,
        rotation: 14,
        scale: 0.45,
        opacity: 0,
        duration: 0.85,
        ease: "power2.in",
      },
      3.15,
    );
}
