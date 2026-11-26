import { describe, expect, it } from "vitest";
import { shillScore } from "./score";

const sc = (completed: number, expired: number, uniqueSponsors: number) => {
  const s = shillScore({ completed, expired, uniqueSponsors });
  return s.kind === "scored" ? s.score : "new";
};

describe("shillScore", () => {
  it("new creator has no score", () => expect(sc(0, 0, 0)).toBe("new"));
  it("perfect record is 100", () => expect(sc(10, 0, 5)).toBe(100));
  // 50*1 + 30*0.1 + 20*0.2 = 57
  it("one paid post from one sponsor", () => expect(sc(1, 0, 1)).toBe(57));
  // 50*0.5 + 30*0.1 + 20*0.2 = 32
  it("one paid, one missed", () => expect(sc(1, 1, 1)).toBe(32));
  it("only missed deadlines is 0, not NaN", () => expect(sc(0, 2, 0)).toBe(0));
});
