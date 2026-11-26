import type { Status } from "./indexer";

export const STATUS_BY_INDEX = ["None", "Created", "Accepted", "Submitted", "Paid", "Refunded", "Declined"] as const;

export type Live = {
  status: Status | "None";
  acceptBy: number;
  deliverBy: number;
  submittedAt: number;
  reviewWindow: number;
};

/** What can happen next, given the on-chain state and the current time. */
export function nextActions(c: Live, now: number) {
  return {
    canAccept: c.status === "Created" && now <= c.acceptBy,
    canDecline: c.status === "Created",
    canCancel: c.status === "Created",
    canSubmit: c.status === "Accepted" && now <= c.deliverBy,
    canApprove: c.status === "Submitted",
    canAutoRelease: c.status === "Submitted" && now > c.submittedAt + c.reviewWindow,
    canRefundExpired:
      (c.status === "Created" && now > c.acceptBy) || (c.status === "Accepted" && now > c.deliverBy),
    releaseAt: c.submittedAt + c.reviewWindow,
  };
}

/** Status to show in lists: an offer or job whose deadline passed shows as Expired. */
export function shownStatus(c: Pick<Live, "status" | "acceptBy" | "deliverBy">, now: number): Status | "Expired" {
  if (c.status === "Created" && now > c.acceptBy) return "Expired";
  if (c.status === "Accepted" && now > c.deliverBy) return "Expired";
  return c.status === "None" ? "Created" : c.status;
}
