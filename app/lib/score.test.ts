import { describe, expect, it } from "vitest";
import { shillScore } from "./score";

describe("shillScore", () => {
  it("new creator has no score", () => {
    expect(shillScore({ completed: 0, onTime: 0, expired: 0, uniqueSponsors: 0 })).toEqual({ kind: "new" });
  });
  it("perfect record is 100", () => {
    const s = shillScore({ completed: 10, onTime: 10, expired: 0, uniqueSponsors: 5 });
    expect(s.kind === "scored" && s.score).toBe(100);
  });
  it("one paid on-time post from one sponsor", () => {
    // 40*1 + 30*1 + 20*0.1 + 10*0.2 = 74
    const s = shillScore({ completed: 1, onTime: 1, expired: 0, uniqueSponsors: 1 });
    expect(s.kind === "scored" && s.score).toBe(74);
  });
  it("only expired campaigns gives a low score, not NaN", () => {
    const s = shillScore({ completed: 0, onTime: 0, expired: 2, uniqueSponsors: 0 });
    expect(s.kind === "scored" && s.score).toBe(0);
  });
});
