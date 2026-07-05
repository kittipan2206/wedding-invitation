// Post-event "memory mode" — after the wedding day ends, the invitation
// quietly becomes a keepsake album: invite-only UI (RSVP, travel info,
// calendar/navigate buttons) disappears and the gallery moves up front.
// No redeploy needed; flips automatically based on event_date_iso.

export function isPostEvent(cfg, now = new Date()) {
  const iso = cfg?.event_date_iso;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return false;
  return now > new Date(`${iso}T23:59:59+07:00`);
}

export function applyMemoryMode(cfg, now = new Date()) {
  if (!isPostEvent(cfg, now)) return false;

  document.body.classList.add("post-event");

  // Hero badge: "Wedding Invitation" → "Our Wedding Memory"
  const badge = document.querySelector(".hero-badge");
  if (badge) {
    badge.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        node.textContent = "Our Wedding Memory";
      }
    });
  }

  // Invite-only UI is no longer actionable
  const rsvp = document.getElementById("rsvp");
  if (rsvp) rsvp.style.display = "none";
  document
    .querySelectorAll(".map-actions, .map-actions-alt, .travel-info")
    .forEach((el) => {
      el.style.display = "none";
    });

  // The album is now the main event — surface it right after the thank-you
  const countdown = document.getElementById("countdown");
  const gallery = document.getElementById("gallery");
  if (countdown && gallery) countdown.after(gallery);

  const groom = cfg?.groom_name || "นนท์";
  const bride = cfg?.bride_name || "เมย์";
  document.title = `${groom} & ${bride} — ขอบคุณที่ร่วมงานแต่งงานของเรา`;

  return true;
}
