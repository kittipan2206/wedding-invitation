// Serves the wedding .ics from a real URL. In-app browsers (LINE/Facebook)
// can't save client-side blob downloads, but they can navigate here; iOS then
// shows the native "add to calendar" preview (inline), everything else gets a
// normal file download (attachment).
//
// Event details come from query params supplied by the client (which holds
// the freshest validated config) — each param is validated/capped below and
// falls back to CONFIG_DEFAULTS, so a tampered URL can only produce a
// harmless calendar file for the tamperer themselves.
import { buildIcs } from "../src/js/ics.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;
const MAX_TEXT = 150;

function cleanText(value) {
  if (typeof value !== "string") return undefined;
  const s = value.trim().slice(0, MAX_TEXT);
  return s || undefined;
}

export default function handler(req, res) {
  const q = req.query || {};

  // Only forward params that pass validation — buildIcs merges CONFIG_DEFAULTS
  const cfg = {};
  if (DATE_RE.test(String(q.date || ""))) cfg.event_date_iso = q.date;
  if (TIME_RE.test(String(q.start || ""))) cfg.event_time_ceremony = q.start;
  const groom = cleanText(q.groom);
  const bride = cleanText(q.bride);
  const venue = cleanText(q.venue);
  if (groom) cfg.groom_name = groom;
  if (bride) cfg.bride_name = bride;
  if (venue) cfg.venue_name = venue;

  const ics = buildIcs(cfg);

  const ua = String(req.headers["user-agent"] || "");
  const disposition = /iPhone|iPad|iPod/i.test(ua) ? "inline" : "attachment";

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="wedding-non-may.ics"`,
  );
  // Response varies by query AND User-Agent — don't let a CDN mix them up
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(ics);
}
