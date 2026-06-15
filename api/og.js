import fs from "fs";
import path from "path";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

const DEFAULTS = {
  groom_name: "นนท์",
  bride_name: "เมย์",
  event_date_display: "วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569",
  venue_name: "ตำบลแป-ระ อำเภอท่าแพ จังหวัดสตูล",
  rsvp_deadline_display: "28 กุมภาพันธ์",
  og_image: "https://non-may.vercel.app/og-image.png",
};

// In-memory cache — best-effort for warm instances
let _cache = null;
let _cachedAt = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getConfig() {
  const now = Date.now();
  if (_cache && now - _cachedAt < TTL_MS) return _cache;
  try {
    const res = await fetch(`${GAS_URL}?type=config`, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object" && !Array.isArray(data)) {
        _cache = { ...DEFAULTS, ...data };
        _cachedAt = now;
        return _cache;
      }
    }
  } catch {
    // GAS unreachable — use cached or defaults
  }
  return _cache ?? { ...DEFAULTS };
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Short deterministic hash (FNV-1a, base36) — used to version the og:image URL
// so Facebook/LINE/Twitter re-scrape when shared details change. The image is
// evergreen, but the cache-bust forces crawlers to drop their old cached preview
// (which may still hold the previous static image + stale description).
function shortHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export default async function handler(req, res) {
  // Locate the template HTML:
  // - Production (Vercel): dist/_template.html (renamed by postbuild so it's not served statically)
  // - Local dev (vercel dev): source index.html
  let htmlPath = path.join(process.cwd(), "dist", "_template.html");
  if (!fs.existsSync(htmlPath)) {
    htmlPath = path.join(process.cwd(), "dist", "index.html");
  }
  if (!fs.existsSync(htmlPath)) {
    htmlPath = path.join(process.cwd(), "index.html");
  }

  let html;
  try {
    html = fs.readFileSync(htmlPath, "utf-8");
  } catch {
    res.status(500).end("index.html not found");
    return;
  }

  const cfg = await getConfig();

  // After the wedding day, shared links read as a memory album, not an invite
  // (GAS may return event_date_iso as a full ISO datetime — take the date part)
  const datePart = String(cfg.event_date_iso || "").slice(0, 10);
  const postEvent =
    /^\d{4}-\d{2}-\d{2}$/.test(datePart) &&
    new Date() > new Date(`${datePart}T23:59:59+07:00`);

  const couple = `${cfg.groom_name} & ${cfg.bride_name}`;
  const title = escAttr(
    postEvent
      ? `${couple} — ขอบคุณที่ร่วมงานแต่งงานของเรา`
      : `${couple} — ขอเรียนเชิญร่วมงานแต่งงาน ${cfg.event_date_display}`,
  );
  const description = escAttr(
    postEvent
      ? `ภาพความทรงจำจากงานแต่งงาน ${couple} ${cfg.event_date_display}`
      : `ขอเรียนเชิญร่วมงานแต่งงาน ${couple} ` +
          `ใน${cfg.event_date_display}` +
          (cfg.venue_name ? ` ณ ${cfg.venue_name}` : "") +
          (cfg.rsvp_deadline_display
            ? ` กรุณาตอบรับภายในวันที่ ${cfg.rsvp_deadline_display}`
            : ""),
  );
  // Evergreen image, but version the URL so crawlers re-scrape when the couple
  // changes any shared detail (date/venue/names/deadline → new hash → new URL).
  const baseImage = cfg.og_image || DEFAULTS.og_image;
  const ver = shortHash(
    [
      couple,
      cfg.event_date_display,
      cfg.venue_name,
      cfg.rsvp_deadline_display,
      postEvent ? "post" : "pre",
    ].join("|"),
  );
  const sep = baseImage.includes("?") ? "&" : "?";
  const ogImage = escAttr(`${baseImage}${sep}v=${ver}`);

  html = html
    .replaceAll("{{og_title}}", title)
    .replaceAll("{{og_description}}", description)
    .replaceAll("{{og_image}}", ogImage);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // CDN-level cache: 5 min fresh, then serve stale while revalidating in background
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
  res.send(html);
}
