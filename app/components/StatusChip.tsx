import type { Status } from "@/lib/indexer";

const STYLE: Record<string, string> = {
  Created: "bg-sky",
  Accepted: "bg-lilac",
  Submitted: "bg-yellow",
  Paid: "bg-green",
  Refunded: "bg-white",
  Declined: "bg-white",
  Expired: "bg-red text-white",
};
const LABEL: Record<string, string> = { Created: "Offer sent", Submitted: "Post submitted", Accepted: "In progress" };

export function StatusChip({ status }: { status: Status | "Expired" }) {
  return <span className={`tag ${STYLE[status]}`}>{LABEL[status] ?? status}</span>;
}
