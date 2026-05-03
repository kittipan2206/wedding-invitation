/** Mock helper for Google Apps Script (GAS) API calls in Playwright tests. */

export const DEFAULT_CONFIG = {
  groom_name: "นนท์",
  bride_name: "เมย์",
  event_date_iso: "2026-03-15",
  event_date_display: "วันเสาร์ที่ 15 มีนาคม พ.ศ. 2569",
  event_time_ceremony: "11:00",
  event_time_lunch: "12:00",
  venue_name: "ตำบลแป-ระ อำเภอท่าแพ จังหวัดสตูล",
  dress_code: "Pastel Formal",
  rsvp_deadline_iso: "2099-02-28",
  rsvp_deadline_display: "28 กุมภาพันธ์ 2569",
  music_url: "",
  travel_airport: "ระยะทางประมาณ 1 ชั่วโมงครึ่ง จากสนามบิน",
  travel_hotel: "โรงแรมในตัวเมืองสตูล ห่างจากงาน ~20 นาที",
  travel_car: "มีที่จอดรถสำหรับแขกเพียงพอ ไม่มีค่าใช้จ่าย",
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {Object} overrides
 * @param {Object} [overrides.config] - override config fields
 * @param {Array}  [overrides.guestbook] - guestbook entries
 * @param {Array}  [overrides.photos] - photo entries
 * @param {Object} [overrides.rsvpResult] - RSVP POST response
 * @param {Object} [overrides.guestbookResult] - guestbook POST response
 */
export async function mockGAS(page, overrides = {}) {
  await page.route("**/script.google.com/**", async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (method === "POST") {
      // RSVP or guestbook submission
      const body = req.postData() ?? "";
      if (url.includes("type=rsvp") || body.includes('"type":"rsvp"')) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(overrides.rsvpResult ?? { ok: true }),
        });
      } else if (url.includes("type=guestbook") || body.includes('"type":"guestbook"')) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(overrides.guestbookResult ?? { ok: true }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      }
      return;
    }

    // GET requests
    if (url.includes("type=config")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...DEFAULT_CONFIG, ...(overrides.config ?? {}) }),
      });
    } else if (url.includes("type=guestbook")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(overrides.guestbook ?? []),
      });
    } else if (url.includes("type=photos_all") || url.includes("type=photos")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(overrides.photos ?? []),
      });
    } else if (url.includes("type=rsvp_all")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(overrides.rsvpList ?? []),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
  });
}
