const SHEET_URL =
  'https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec';

export const CONFIG_DEFAULTS = {
  groom_name: 'นนท์',
  bride_name: 'เมย์',
  event_date_display: 'วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569',
  event_date_iso: '2026-03-15',
  event_time_ceremony: '11:00',
  event_time_lunch: '12:00',
  venue_name: 'ตำบลแป-ระ อำเภอท่าแพ จังหวัดสตูล',
  dress_code: 'Pastel Formal',
  rsvp_deadline_display: '28 กุมภาพันธ์ 2569',
  music_url: '/music.mp3',
  travel_airport: 'ระยะทางประมาณ 1 ชั่วโมงครึ่ง จากสนามบิน',
  travel_hotel: 'โรงแรมในตัวเมืองสตูล ห่างจากงาน ~20 นาที',
  travel_car: 'มีที่จอดรถสำหรับแขกเพียงพอ ไม่มีค่าใช้จ่าย',
};

export async function fetchConfig() {
  try {
    const res = await fetch(`${SHEET_URL}?type=config`, { redirect: 'follow' });
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function injectConfig(cfg) {
  const c = { ...CONFIG_DEFAULTS, ...(cfg || {}) };
  window.__weddingConfig = c;

  // [data-config] simple text injection (travel items, etc.)
  document.querySelectorAll('[data-config]').forEach(el => {
    const key = el.getAttribute('data-config');
    if (c[key] != null) el.textContent = c[key];
  });

  // Hero date — typewriter reads attr when envelope opens
  const heroDate = document.querySelector('.hero-date');
  if (heroDate) heroDate.setAttribute('data-typewriter', c.event_date_display);

  // Detail cards
  const dcDate = document.getElementById('dc-date');
  if (dcDate) dcDate.textContent = c.event_date_display;

  const dcTime = document.getElementById('dc-time');
  if (dcTime) dcTime.innerHTML =
    `เริ่มพิธี ${c.event_time_ceremony} น.<br/>รับประทานอาหาร ${c.event_time_lunch} น.`;

  const dcVenue = document.getElementById('dc-venue');
  if (dcVenue) {
    const m = c.venue_name.match(/^(.+?)\s+(จังหวัด.+)$/);
    dcVenue.innerHTML = m ? `${m[1]}<br/>${m[2]}` : c.venue_name;
  }

  const dcDress = document.getElementById('dc-dress');
  if (dcDress) dcDress.textContent = c.dress_code;

  // Map iframe src
  const mapIframe = document.getElementById('map-iframe');
  if (mapIframe && c.venue_maps_embed) mapIframe.src = c.venue_maps_embed;

  // RSVP deadline
  const rsvpDeadline = document.getElementById('rsvp-deadline-text');
  if (rsvpDeadline) rsvpDeadline.textContent = `กรุณาตอบรับภายในวันที่ ${c.rsvp_deadline_display}`;
}
