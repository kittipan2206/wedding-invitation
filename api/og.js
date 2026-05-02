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

export default async function handler(req, res) {
  // Locate the built index.html (production) or source (local dev)
  let htmlPath = path.join(process.cwd(), "dist", "index.html");
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

  const title = escAttr(
    `${cfg.groom_name} & ${cfg.bride_name} — ขอเรียนเชิญร่วมงานแต่งงาน ${cfg.event_date_display}`,
  );
  const description = escAttr(
    `ขอเรียนเชิญร่วมงานแต่งงาน ${cfg.groom_name} & ${cfg.bride_name} ` +
      `ใน${cfg.event_date_display}` +
      (cfg.venue_name ? ` ณ ${cfg.venue_name}` : "") +
      (cfg.rsvp_deadline_display
        ? ` กรุณาตอบรับภายในวันที่ ${cfg.rsvp_deadline_display}`
        : ""),
  );
  const ogImage = escAttr(cfg.og_image || DEFAULTS.og_image);

  html = html
    .replaceAll("{{og_title}}", title)
    .replaceAll("{{og_description}}", description)
    .replaceAll("{{og_image}}", ogImage);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // CDN-level cache: 5 min fresh, then serve stale while revalidating in background
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
  res.send(html);
}
