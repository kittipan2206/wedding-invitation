import { describe, it, expect, vi } from "vitest";
import { renderPage, ssrConfigScript } from "../../api/og.js";
import ogImage from "../../api/og-image.js";
import { CONFIG_DEFAULTS } from "../../src/js/config.js";

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

describe("api/og — preview addressed to a ?to= guest", () => {
  const html = `<title>{{og_title}}</title><meta property="og:description" content="{{og_description}}" /><meta property="og:image" content="{{og_image}}" /></head>`;
  const cfg = { ...CONFIG_DEFAULTS, event_date_iso: "2099-01-01" };

  it("puts the guest's name in the title and date in the description", () => {
    const out = renderPage(html, cfg, null, "ต้น");
    expect(out).toContain("<title>ถึง คุณต้น — นนท์ &amp; เมย์ ขอเรียนเชิญร่วมงานแต่งงาน</title>");
    expect(out).toMatch(/og:description" content="[^"]*28 กุมภาพันธ์/);
  });

  it("points og:image at the envelope addressed to them", () => {
    const out = renderPage(html, cfg, null, "ต้น");
    expect(out).toContain(
      `og:image" content="https://siriwan.kittipan.net/api/og-image?to=${encodeURIComponent("ต้น")}&amp;v=`,
    );
  });

  it("uses the plain envelope without a guest", () => {
    const out = renderPage(html, cfg, null, "");
    expect(out).toContain('og:image" content="https://siriwan.kittipan.net/og-envelope.png?v=');
    expect(out).toContain("ขอเรียนเชิญร่วมงานแต่งงาน วันอาทิตย์ที่ 28");
  });

  it("does not stack คุณ and escapes the name", () => {
    expect(renderPage(html, cfg, null, "คุณสมชาย")).toContain("<title>ถึง คุณสมชาย —");
    const out = renderPage(html, cfg, null, '"><script>x</script>');
    expect(out).not.toContain("<script>x");
    expect(out).toContain("&quot;&gt;&lt;script&gt;");
  });
});

describe("api/og-image — envelope addressed to one guest", () => {
  const call = (query) => {
    const res = { headers: {}, setHeader: (k, v) => (res.headers[k] = v) };
    res.status = (c) => ((res.code = c), res);
    res.send = (b) => (res.body = b);
    res.redirect = (c, u) => ((res.code = c), (res.location = u));
    ogImage({ query }, res);
    return res;
  };

  it("returns a 1200×630 PNG for a Thai name", () => {
    const res = call({ to: "ต้น" });
    expect(res.code).toBe(200);
    expect(res.headers["Content-Type"]).toBe("image/png");
    expect(res.body.subarray(1, 4).toString()).toBe("PNG");
    expect(res.body.readUInt32BE(16)).toBe(1200);
    expect(res.body.readUInt32BE(20)).toBe(630);
  });

  it("sends name-less requests to the plain envelope", () => {
    const res = call({ to: "  " });
    expect(res.code).toBe(302);
    expect(res.location).toBe("/og-envelope.png");
  });
});
