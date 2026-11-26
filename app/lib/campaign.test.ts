import { describe, expect, it } from "vitest";
import { nextActions, shownStatus } from "./campaign";

const base = { acceptBy: 100, deliverBy: 200, submittedAt: 0, reviewWindow: 3600 };

describe("nextActions mirrors the contract rules", () => {
  it("offer before and after accept-by", () => {
    expect(nextActions({ ...base, status: "Created" }, 100).canAccept).toBe(true);
    expect(nextActions({ ...base, status: "Created" }, 101).canAccept).toBe(false);
    expect(nextActions({ ...base, status: "Created" }, 101).canRefundExpired).toBe(true);
    expect(nextActions({ ...base, status: "Created" }, 100).canRefundExpired).toBe(false);
  });
  it("accepted job before and after deliver-by", () => {
    expect(nextActions({ ...base, status: "Accepted" }, 200).canSubmit).toBe(true);
    expect(nextActions({ ...base, status: "Accepted" }, 201).canSubmit).toBe(false);
    expect(nextActions({ ...base, status: "Accepted" }, 201).canRefundExpired).toBe(true);
  });
  it("auto release only strictly after the review window", () => {
    const c = { ...base, status: "Submitted" as const, submittedAt: 150 };
    expect(nextActions(c, 150 + 3600).canAutoRelease).toBe(false);
    expect(nextActions(c, 151 + 3600).canAutoRelease).toBe(true);
    expect(nextActions(c, 151 + 3600).canRefundExpired).toBe(false);
  });
  it("final states allow nothing", () => {
    for (const status of ["Paid", "Refunded", "Declined"] as const) {
      const a = nextActions({ ...base, status }, 1e9);
      expect(Object.entries(a).filter(([k, v]) => k !== "releaseAt" && v)).toEqual([]);
    }
  });
  it("shownStatus marks expired", () => {
    expect(shownStatus({ ...base, status: "Created" }, 101)).toBe("Expired");
    expect(shownStatus({ ...base, status: "Accepted" }, 150)).toBe("Accepted");
  });
});
