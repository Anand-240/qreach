import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./normalizeUrl";

const n = (s: string) => {
  const r = normalizeUrl(s);
  return r.ok ? r.url : `ERR:${r.error}`;
};

describe("normalizeUrl", () => {
  it("gives one canonical form for the same X post", () => {
    const want = "https://x.com/riya/status/1234567890";
    for (const s of [
      "https://x.com/riya/status/1234567890",
      "https://twitter.com/Riya/status/1234567890?s=20&t=abc",
      "https://mobile.twitter.com/riya/status/1234567890/",
      "https://www.x.com/riya/status/1234567890/photo/1",
      "x.com/riya/status/1234567890#reply",
      "http://x.com/RIYA/statuses/1234567890",
      "  https://X.COM/riya/status/1234567890  ",
    ])
      expect(n(s), s).toBe(want);
  });

  it("canonicalises instagram and youtube", () => {
    expect(n("https://www.instagram.com/reel/Cx1Ab2/?igsh=xyz")).toBe("https://instagram.com/reel/Cx1Ab2");
    expect(n("https://instagram.com/riya/p/Cx1Ab2/")).toBe("https://instagram.com/p/Cx1Ab2");
    expect(n("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("https://youtube.com/watch/dQw4w9WgXcQ");
    expect(n("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("https://youtube.com/watch/dQw4w9WgXcQ");
  });

  it("keeps other sites but strips tracking", () => {
    expect(n("https://www.linkedin.com/posts/riya_abc-123/?utm_source=share")).toBe(
      "https://linkedin.com/posts/riya_abc-123",
    );
  });

  it("rejects bad input", () => {
    expect(n("")).toMatch(/^ERR/);
    expect(n("not a link")).toMatch(/^ERR/);
    expect(n("ftp://x.com/a")).toMatch(/^ERR/);
    expect(n("https://user:pw@x.com/a/status/1")).toMatch(/^ERR/);
    expect(n("https://x.com/" + "a".repeat(300))).toMatch(/^ERR/);
    expect(n("https://x.com/é")).toBe("https://x.com/%C3%A9"); // URL encodes it into ASCII
  });

  it("always passes the contract URL rule", () => {
    for (const s of ["x.com/a/status/1", "https://instagram.com/p/a", "https://example.org/x?y=1"]) {
      const r = normalizeUrl(s);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.url.startsWith("https://")).toBe(true);
        expect(/^[\x21-\x7e]{10,300}$/.test(r.url)).toBe(true);
      }
    }
  });
});
