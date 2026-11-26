"use client";
import Link from "next/link";
import type { CampaignRow } from "@/lib/indexer";
import { shownStatus } from "@/lib/campaign";
import { fmtDate, fmtQusdc } from "@/lib/format";
import { StatusChip } from "./StatusChip";
import { Who } from "./Who";
import { useChainNow } from "./useChainNow";

/** What the viewer has to do next on a campaign, if anything. */
function todo(c: CampaignRow, role: "sponsor" | "creator", now: number): string | null {
  if (!now) return null;
  if (role === "creator" && c.status === "Created" && now <= c.acceptBy) return "Accept or decline";
  if (role === "creator" && c.status === "Accepted" && now <= c.deliverBy) return "Post and submit link";
  if (role === "sponsor" && c.status === "Submitted") return "Review the post";
  if ((c.status === "Created" && now > c.acceptBy) || (c.status === "Accepted" && now > c.deliverBy)) return "Refund available";
  return null;
}

export function CampaignList({ rows, role, empty }: { rows: CampaignRow[]; role: "sponsor" | "creator"; empty: React.ReactNode }) {
  const now = useChainNow();
  if (rows.length === 0) return <div className="bx-flat border-dashed p-6 text-sm">{empty}</div>;
  return (
    <ul className="space-y-4">
      {rows.map((c, i) => {
        const t = todo(c, role, now);
        return (
          <li key={String(c.id)} className="rise" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
            <Link
              href={`/c/${c.id}`}
              className="bx group flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <span className="mono text-xs font-bold">#{String(c.id)}</span>
              <span className="display text-xl">{fmtQusdc(c.amount)} <span className="text-sm">QUSDC</span></span>
              <span className="text-sm">
                {role === "sponsor" ? "to " : "from "}
                <Who addr={role === "sponsor" ? c.creator : c.sponsor} link={false} />
              </span>
              {now > 0 && <StatusChip status={shownStatus(c, now)} />}
              {t && <span className="tag bg-ink text-yellow">{t}</span>}
              <span className="w-full truncate text-sm text-dim sm:ml-auto sm:w-auto sm:max-w-xs">{c.brief}</span>
              <span className="mono hidden text-xs lg:inline">post by {fmtDate(c.deliverBy)}</span>
              <span className="display ml-auto text-xl transition-transform group-hover:translate-x-1 sm:ml-0" aria-hidden>
                &gt;
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
