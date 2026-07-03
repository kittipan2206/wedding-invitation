// Apple Calendar (.ics) support — builds an RFC 5545 file client-side.
// Google Calendar guests use the existing link button; iPhone guests download
// this file and iOS offers "Add to Calendar" natively.
import { CONFIG_DEFAULTS } from "./config.js";

const SITE_URL = "https://non-may.vercel.app";

// Escape TEXT values per RFC 5545: backslash, semicolon, comma, newline.
// (venue_name currently contains commas — they must not split the field)
export function icsEscape(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Bangkok has no DST, so local wedding time → UTC is a fixed -7 h shift.
// Using UTC (Z) avoids shipping a VTIMEZONE block for strict parsers.
// icsUtcStamp("2027-02-28", "09:00") → "20270228T020000Z"
export function icsUtcStamp(dateIso, timeHHMM) {
  const [y, mo, d] = dateIso.split("-").map(Number);
  const t = /^(\d{1,2}):(\d{2})/.exec(timeHHMM || "");
  const hh = t ? Number(t[1]) : 0;
  const mm = t ? Number(t[2]) : 0;
  const utc = new Date(Date.UTC(y, mo - 1, d, hh, mm) - 7 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${utc.getUTCFullYear()}${p(utc.getUTCMonth() + 1)}${p(utc.getUTCDate())}` +
    `T${p(utc.getUTCHours())}${p(utc.getUTCMinutes())}00Z`
  );
}

export function buildIcs(cfg, now = new Date()) {
  const c = { ...CONFIG_DEFAULTS, ...(cfg || {}) };
  // GAS may return event_date_iso as a full ISO datetime — take the date part
  const datePart = String(c.event_date_iso || "").slice(0, 10);
  const ceremony = /^\d{1,2}:\d{2}/.test(c.event_time_ceremony || "")
    ? c.event_time_ceremony
    : "11:00";
  const couple = `${c.groom_name} & ${c.bride_name}`;
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  // Same event window as the Google Calendar button (ceremony start → 16:00).
  // Long-line folding is intentionally skipped — Apple and Google both accept
  // long UTF-8 lines, and folding risks splitting multi-byte Thai characters.
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//non-may.vercel.app//Wedding Invitation//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable UID: re-downloading after a date change updates the same event
    `UID:wedding-non-may@non-may.vercel.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsUtcStamp(datePart, ceremony)}`,
    `DTEND:${icsUtcStamp(datePart, "16:00")}`,
    `SUMMARY:${icsEscape(`งานแต่งงาน ${couple}`)}`,
    `DESCRIPTION:${icsEscape(
      `ขอเรียนเชิญร่วมงานแต่งงาน ${couple}\n${SITE_URL}`,
    )}`,
    `LOCATION:${icsEscape(c.venue_name)}`,
    `URL:${SITE_URL}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

export function initIcsButton() {
  const btn = document.getElementById("calendar-ics-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    // Read config at click time — always fresh even after SWR re-inject
    const ics = buildIcs(window.__weddingConfig);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wedding-non-may.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}
