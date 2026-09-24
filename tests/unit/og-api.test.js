import { describe, it, expect } from "vitest";
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
