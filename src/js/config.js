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

export async function fetchConfig() {
  try {
    const res = await fetch(`${SHEET_URL}?type=config`, { redirect: "follow" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return normalizeConfigValues(data);
  } catch {
    return null;
  }
}

export function injectConfig(cfg) {
  const c = { ...CONFIG_DEFAULTS, ...(cfg || {}) };
  window.__weddingConfig = c;

  // [data-config] simple text injection (travel items, etc.)
  document.querySelectorAll("[data-config]").forEach((el) => {
    const key = el.getAttribute("data-config");
    if (c[key] != null) el.textContent = c[key];
  });

  // Hero couple names
  const heroNames = document.querySelector(".hero-names");
  if (heroNames) {
    heroNames.innerHTML = `${c.groom_name} <span class="ampersand">&amp;</span> ${c.bride_name}`;
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
}
