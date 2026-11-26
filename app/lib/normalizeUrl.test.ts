import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./normalizeUrl";

const n = (s: string) => {
  const r = normalizeUrl(s);
  return r.ok ? r.url : `ERR:${r.error}`;
};

describe("normalizeUrl: the same post gives one URL", () => {
  it("X: every share form, any username", () => {
    const want = "https://x.com/i/status/1234567890";
    for (const s of [
      "https://x.com/riya/status/1234567890",
      "https://twitter.com/Riya/status/1234567890?s=20&t=abc",
      "https://mobile.twitter.com/riya/status/1234567890/",
      "https://www.x.com/riya/status/1234567890/photo/1",
      "x.com/riya/status/1234567890#reply",
      "http://x.com/RIYA/statuses/1234567890",
      "https://x.com/someoneelse/status/1234567890",
      "https://x.com/i/status/1234567890",
      "https://x.com/i/web/status/1234567890",
      "  https://X.COM/riya/status/1234567890  ",
    ])
      expect(n(s), s).toBe(want);
  });

  it("Instagram: p, reel, reels, with and without username", () => {
    expect(n("https://www.instagram.com/reel/Cx1Ab2/?igsh=xyz")).toBe("https://instagram.com/reel/Cx1Ab2");
    expect(n("https://instagram.com/reels/Cx1Ab2/")).toBe("https://instagram.com/reel/Cx1Ab2");
    expect(n("https://instagram.com/riya/p/Cx1Ab2/")).toBe("https://instagram.com/p/Cx1Ab2");
  });

  it("YouTube: watch, youtu.be, shorts, live", () => {
    const want = "https://youtube.com/watch/dQw4w9WgXcQ";
    for (const s of [
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://youtube.com/live/dQw4w9WgXcQ?feature=share",
    ])
      expect(n(s), s).toBe(want);
  });

  it("other sites: tracking dropped, order does not matter", () => {
    expect(n("https://www.linkedin.com/posts/riya_abc-123/?utm_source=share&utm_medium=x")).toBe("https://linkedin.com/posts/riya_abc-123");
    expect(n("https://example.org/p?b=2&a=1&utm_source=x")).toBe(n("https://example.org/p?a=1&b=2"));
  });
});

describe("normalizeUrl: different posts never share a URL", () => {
  it("keeps id-carrying query strings", () => {
    expect(n("https://facebook.com/permalink.php?story_fbid=111&id=9")).not.toBe(n("https://facebook.com/permalink.php?story_fbid=222&id=9"));
    expect(n("https://news.ycombinator.com/item?id=1")).not.toBe(n("https://news.ycombinator.com/item?id=2"));
    expect(n("https://x.com/a/status/1")).not.toBe(n("https://x.com/a/status/2"));
  });
  it("YouTube watch without a video id is refused", () => {
    expect(n("https://youtube.com/watch")).toMatch(/^ERR/);
  });
});

describe("normalizeUrl: input checks", () => {
  it("rejects bad input", () => {
    expect(n("")).toMatch(/^ERR/);
    expect(n("not a link")).toMatch(/^ERR/);
    expect(n("ftp://x.com/a")).toMatch(/^ERR/);
    expect(n("https://user:pw@x.com/a/status/1")).toMatch(/^ERR/);
    expect(n("https://x.com/" + "a".repeat(300))).toMatch(/^ERR/);
    expect(n("https://x.com/é")).toBe("https://x.com/%C3%A9");
  });
  it("always passes the contract URL rule", () => {
    for (const s of ["x.com/a/status/1", "https://instagram.com/p/a", "https://example.org/x?y=1", "https://news.ycombinator.com/item?id=5"]) {
      const r = normalizeUrl(s);
      expect(r.ok).toBe(true);
      if (r.ok) expect(/^https:\/\/[\x21-\x7e]{2,292}$/.test(r.url)).toBe(true);
    }
  });
});
