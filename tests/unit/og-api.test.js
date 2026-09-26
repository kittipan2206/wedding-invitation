import { describe, it, expect, vi } from "vitest";
import { ssrConfigScript } from "../../api/og.js";

describe("api/og — config embedded in the page", () => {
  it("embeds the live sheet config for the client", () => {
    const s = ssrConfigScript({ groom_name: "นนท์" });
    expect(s).toBe('<script>window.__SSR_CONFIG={"groom_name":"นนท์"}</script>');
  });

  it("escapes < so sheet text cannot close the script tag", () => {
    const s = ssrConfigScript({ venue_name: "</script><img src=x onerror=alert(1)>" });
    expect(s.match(/<\/script>/g)).toHaveLength(1); // only our own closing tag
    expect(s).toContain("\\u003c/script>");
  });

  it("embeds nothing when GAS was unreachable (defaults must stay client-side)", () => {
    expect(ssrConfigScript(null)).toBe("");
  });
});

describe("api/og — link preview text", () => {
  it("fixes the sheet's weekday and trailing dot before crawlers see them", async () => {
    const { default: handler } = await import("../../api/og.js");
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          event_date_iso: "2027-02-28T00:00:00.000Z",
          event_date_display: "วันเสาร์ที่ 28 กุมภาพันธ์ พ.ศ. 2570",
          rsvp_deadline_display: "25 กุมภาพันธ์ 2570.",
        }),
      ),
    );
    let html = "";
    const res = { setHeader() {}, status: () => res, end() {}, send: (b) => (html = b) };
    await handler({}, res);
    expect(html).toContain('og:title" content="นนท์ &amp; เมย์ — ขอเรียนเชิญร่วมงานแต่งงาน วันอาทิตย์ที่ 28');
    const meta = html.match(/<meta[^>]*(og|twitter):[^>]*>/g).join("\n");
    expect(meta).not.toContain("วันเสาร์");
    expect(html).toContain("ภายในวันที่ 25 กุมภาพันธ์ 2570\"");
  });
});
