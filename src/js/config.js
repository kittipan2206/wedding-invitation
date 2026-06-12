const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec";

export const CONFIG_DEFAULTS = {
  groom_name: "นนท์",
  bride_name: "เมย์",
  event_date_display: "วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569",
  event_date_iso: "2026-03-15",
  event_time_ceremony: "11:00",
  event_time_lunch: "12:00",
  venue_name: "ตำบลแป-ระ อำเภอท่าแพ จังหวัดสตูล",
  dress_code: "Pastel Formal",
  rsvp_deadline_display: "28 กุมภาพันธ์ 2569",
  music_url: "/music.mp3",
  travel_airport: "ระยะทางประมาณ 1 ชั่วโมงครึ่ง จากสนามบิน",
  travel_hotel: "โรงแรมในตัวเมืองสตูล ห่างจากงาน ~20 นาที",
  travel_car: "มีที่จอดรถสำหรับแขกเพียงพอ ไม่มีค่าใช้จ่าย",
  og_image: "https://non-may.vercel.app/og-image.png",
};

// Normalize values that Google Sheets auto-converted to ISO datetime strings.
// e.g. "11:00" → "1899-12-30T11:00:00.000Z"  (time-only epoch)
//      "2026-03-15" → "2026-03-15T00:00:00.000Z"  (date cell)
function normalizeConfigValues(data) {
  const isoRe =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  const out = {};
  Object.entries(data).forEach(([key, raw]) => {
    if (typeof raw !== "string" || !isoRe.test(raw)) {
      out[key] = raw;
      return;
    }
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      out[key] = raw;
      return;
    }
    // Time-only: Sheets encodes as epoch year 1899/1900
    if (d.getUTCFullYear() <= 1900) {
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      out[key] = `${hh}:${mm}`;
      return;
    }
    // Date field — return YYYY-MM-DD
    const yyyy = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    out[key] = `${yyyy}-${mo}-${dd}`;
  });
  return out;
}

// ── Display-string validation ────────────────────────────────────────────────
// Admin edits the sheet by hand — guard guests from common slips: trailing
// punctuation, and a weekday word that doesn't match the actual date.

const THAI_WEEKDAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

export function cleanDisplayString(value) {
  if (typeof value !== "string") return value;
  return value.trim().replace(/[.,\s]+$/, "");
}

export function fixWeekday(display, iso) {
  if (typeof display !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso || ""))
    return display;
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  const correct = THAI_WEEKDAYS[day];
  const m = display.match(
    /วัน(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัสฯ|พฤหัส|ศุกร์|เสาร์)/,
  );
  if (!m) return display;
  const found = m[1].startsWith("พฤหัส") ? "พฤหัสบดี" : m[1];
  if (found === correct) return display;
  console.warn(
    `[wedding-config] "${m[0]}" ใน "${display}" ไม่ตรงกับวันที่จริง ${iso} (วัน${correct}) — แก้ให้อัตโนมัติแล้ว กรุณาแก้ในชีต Admin ด้วย`,
  );
  return display.replace(m[0], `วัน${correct}`);
}

export function validateConfig(c) {
  const out = { ...c };
  out.event_date_display = fixWeekday(
    cleanDisplayString(out.event_date_display),
    out.event_date_iso,
  );
  out.rsvp_deadline_display = cleanDisplayString(out.rsvp_deadline_display);
  if (out.rsvp_deadline_iso && out.event_date_iso) {
    const deadline = new Date(`${out.rsvp_deadline_iso}T23:59:59+07:00`);
    const eventEnd = new Date(`${out.event_date_iso}T23:59:59+07:00`);
    const now = new Date();
    if (now > deadline && now < eventEnd) {
      console.warn(
        "[wedding-config] RSVP ปิดรับแล้ว (เลย rsvp_deadline_iso) แต่วันงานยังมาไม่ถึง — ตรวจสอบ deadline ในชีต Admin",
      );
    }
  }
  return out;
}

const CACHE_KEY = "weddingConfig";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null; // expired
    return data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — silently ignore
  }
}

async function fetchFromGAS() {
  const res = await fetch(`${SHEET_URL}?type=config`, { redirect: "follow" });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return normalizeConfigValues(data);
}

export async function fetchConfig() {
  const cached = readCache();

  // Revalidate in background (SWR) — always fetch fresh copy quietly
  fetchFromGAS()
    .then((fresh) => {
      if (fresh) {
        writeCache(fresh);
        // If data changed vs what we rendered, re-inject automatically
        if (cached && JSON.stringify(fresh) !== JSON.stringify(cached)) {
          injectConfig(fresh);
        }
      }
    })
    .catch(() => {});

  // Return cache instantly if available, otherwise wait for network
  if (cached) return cached;
  try {
    const fresh = await fetchFromGAS();
    if (fresh) writeCache(fresh);
    return fresh;
  } catch {
    return null;
  }
}

export function injectConfig(cfg) {
  const c = validateConfig({ ...CONFIG_DEFAULTS, ...(cfg || {}) });
  window.__weddingConfig = c;

  // [data-config] simple text injection (travel items, etc.)
  document.querySelectorAll("[data-config]").forEach((el) => {
    const key = el.getAttribute("data-config");
    if (c[key] != null) el.textContent = c[key];
  });

  // Hero couple names
  const heroNames = document.querySelector(".hero-names");
  if (heroNames) {
    heroNames.innerHTML = `
      <span class="hero-name hero-name--first">${c.groom_name}</span>
      <span class="ampersand-wrap" aria-hidden="true">
        <span class="ampersand-rule"></span>
        <span class="ampersand">&amp;</span>
        <span class="ampersand-rule"></span>
      </span>
      <span class="hero-name hero-name--second">${c.bride_name}</span>
    `;
  }

  // Footer names + date
  const footerNames = document.getElementById("footer-names");
  if (footerNames)
    footerNames.textContent = `${c.groom_name} & ${c.bride_name}`;

  const footerDate = document.getElementById("footer-date");
  if (footerDate && c.event_date_iso) {
    const [yyyy, mm, dd] = c.event_date_iso.split("-");
    if (dd && mm && yyyy) footerDate.textContent = `${dd} · ${mm} · ${yyyy}`;
  }

  // Hero date — typewriter reads attr when envelope opens
  const heroDate = document.querySelector(".hero-date");
  if (heroDate) heroDate.setAttribute("data-typewriter", c.event_date_display);

  // Detail cards
  const dcDate = document.getElementById("dc-date");
  if (dcDate) dcDate.textContent = c.event_date_display;

  const dcTime = document.getElementById("dc-time");
  if (dcTime)
    dcTime.innerHTML = `เริ่มพิธี ${c.event_time_ceremony} น.<br/>รับประทานอาหาร ${c.event_time_lunch} น.`;

  const dcVenue = document.getElementById("dc-venue");
  if (dcVenue) {
    const m = c.venue_name.match(/^(.+?)\s+(จังหวัด.+)$/);
    dcVenue.innerHTML = m ? `${m[1]}<br/>${m[2]}` : c.venue_name;
  }

  const dcDress = document.getElementById("dc-dress");
  if (dcDress) dcDress.textContent = c.dress_code;

  // Map navigate button href
  const mapNavBtn = document.getElementById("map-navigate-btn");
  if (mapNavBtn && c.venue_maps_url) mapNavBtn.href = c.venue_maps_url;

  // Map iframe src
  const mapIframe = document.getElementById("map-iframe");
  if (mapIframe && c.venue_maps_embed) mapIframe.src = c.venue_maps_embed;

  // RSVP deadline
  const rsvpDeadline = document.getElementById("rsvp-deadline-text");
  if (rsvpDeadline)
    rsvpDeadline.textContent = `กรุณาตอบรับภายในวันที่ ${c.rsvp_deadline_display}`;

  // Envelope front — couple names
  const envCouple = document.querySelector(".env-couple");
  if (envCouple) envCouple.textContent = `${c.groom_name} & ${c.bride_name}`;

  // Loader title
  const loaderTitle = document.getElementById("loader-title");
  if (loaderTitle)
    loaderTitle.textContent = `${c.groom_name} & ${c.bride_name}`;

  // Admin auth screen + topbar (if on admin page)
  const authSub = document.getElementById("auth-sub");
  if (authSub) authSub.textContent = `${c.groom_name} & ${c.bride_name}`;
  const adminBrand = document.getElementById("admin-brand");
  if (adminBrand)
    adminBrand.textContent = `Admin — ${c.groom_name} & ${c.bride_name}`;

  // Guestbook sub + thanks
  const gbSub = document.getElementById("guestbook-sub");
  if (gbSub)
    gbSub.textContent = `ฝากคำอวยพรให้${c.groom_name} & ${c.bride_name}`;

  const gbThanks = document.getElementById("guestbook-thanks-msg");
  if (gbThanks)
    gbThanks.textContent = `คำอวยพรของท่านส่งถึง${c.groom_name} & ${c.bride_name}แล้ว ♡`;

  // Calendar button href (build dynamically from config)
  const calBtn = document.getElementById("calendar-btn");
  if (calBtn && c.event_date_iso && c.event_time_ceremony) {
    const coupleName = `${c.groom_name} & ${c.bride_name}`;
    const dateCompact = c.event_date_iso.replace(/-/g, "");
    const [ch, cm] = c.event_time_ceremony.split(":");
    const startDT = `${dateCompact}T${ch}${cm}00`;
    const endDT = `${dateCompact}T160000`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `งานแต่งงาน ${coupleName}`,
      dates: `${startDT}/${endDT}`,
      ctz: "Asia/Bangkok",
      details: `ขอเรียนเชิญร่วมงานแต่งงาน ${coupleName}`,
      location: c.venue_name || "",
    });
    calBtn.href = `https://calendar.google.com/calendar/render?${params}`;
  }

  // Page title + meta tags — after the event, memory mode owns these
  // (SWR background re-inject must not flip them back to invite wording)
  if (document.body.classList.contains("post-event")) return;
  const couple = `${c.groom_name} & ${c.bride_name}`;
  document.title = `${couple} — ขอเรียนเชิญร่วมงานแต่งงาน`;
  const metaDesc = `ขอเรียนเชิญร่วมงานแต่งงาน ${couple} ${c.event_date_display} ณ ${c.venue_name}`;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", metaDesc);
  document
    .querySelector('meta[property="og:title"]')
    ?.setAttribute("content", `${couple} — ขอเรียนเชิญร่วมงานแต่งงาน`);
  document
    .querySelector('meta[property="og:description"]')
    ?.setAttribute("content", metaDesc);
  document
    .querySelector('meta[name="twitter:title"]')
    ?.setAttribute("content", `${couple} — ขอเรียนเชิญร่วมงานแต่งงาน`);
  document
    .querySelector('meta[name="twitter:description"]')
    ?.setAttribute("content", metaDesc);
}
