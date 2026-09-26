import fs from "fs";
import path from "path";
import {
  CONFIG_DEFAULTS,
  normalizeConfigValues,
  validateConfig,
} from "../src/js/config.js";
import { clipName, previewTitle } from "../src/js/letter.js";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

// Single source of truth with the client (a stale copy here once still
// said 15 มีนาคม 2569 in link previews)
const DEFAULTS = CONFIG_DEFAULTS;

// In-memory cache — best-effort for warm instances
let _cache = null;
let _cachedAt = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// → { cfg, live } — live = the raw sheet data (null when GAS was unreachable
// and nothing is cached), which is embedded in the page for the client
let _live = null;
async function getConfig() {
  const now = Date.now();
  if (_cache && now - _cachedAt < TTL_MS) return { cfg: _cache, live: _live };
  try {
    const res = await fetch(`${GAS_URL}?type=config`, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object" && !Array.isArray(data)) {
        // same cleanup the page applies — the sheet says "วันเสาร์" for a
        // Sunday and link previews used to repeat it
        _cache = validateConfig({ ...DEFAULTS, ...normalizeConfigValues(data) });
        _live = data;
        _cachedAt = now;
        return { cfg: _cache, live: _live };
      }
    }
  } catch {
    // GAS unreachable — use cached or defaults
  }
  return { cfg: _cache ?? { ...DEFAULTS }, live: _live };
}

// JSON for an inline <script>: "<" escaped so sheet text can never close
// the tag (the sheet is admin-edited, but it's still user input)
export function ssrConfigScript(live) {
  if (!live) return "";
  const json = JSON.stringify(live).replace(/</g, "\\u003c");
  return `<script>window.__SSR_CONFIG=${json}</script>`;
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

// Fills the {{og_*}} placeholders. Also run at build time with the defaults
// (vite.config.js) so hosts without this function — Cloudflare Pages serves
// the static index.html — still give crawlers a real title and image.
// `to` = the ?to= guest: their name heads the title and the image is the
// envelope addressed to them (api/og-image.js).
export function renderPage(html, cfg, live = null, to = "") {
  // After the wedding day, shared links read as a memory album, not an invite
  // (GAS may return event_date_iso as a full ISO datetime — take the date part)
  const datePart = String(cfg.event_date_iso || "").slice(0, 10);
  const postEvent =
    /^\d{4}-\d{2}-\d{2}$/.test(datePart) &&
    new Date() > new Date(`${datePart}T23:59:59+07:00`);

  const couple = `${cfg.groom_name} & ${cfg.bride_name}`;
  const guest = postEvent ? "" : clipName(to);
  const title = escAttr(
    postEvent
      ? `${couple} — ขอบคุณที่ร่วมงานแต่งงานของเรา`
      : previewTitle(couple, cfg.event_date_display, guest),
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
      "envelope-1", // bump when the envelope capture changes
    ].join("|"),
  );
  const image = guest
    ? `${new URL(baseImage).origin}/api/og-image?to=${encodeURIComponent(guest)}`
    : baseImage;
  const sep = image.includes("?") ? "&" : "?";
  const ogImage = escAttr(`${image}${sep}v=${ver}`);

  return html
    .replaceAll("{{og_title}}", title)
    .replaceAll("{{og_description}}", description)
    .replaceAll("{{og_image}}", ogImage)
    // the page starts from this config instantly instead of re-asking GAS
    .replace("</head>", `${ssrConfigScript(live)}</head>`);
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

  const { cfg, live } = await getConfig();
  html = renderPage(html, cfg, live, req.query?.to);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // CDN-level cache: 5 min fresh, then keep serving the cached page instantly
  // while it refreshes in the background (a 60 s window used to make the
  // unlucky visitor wait on GAS for the HTML itself)
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=86400");
  res.send(html);
}
