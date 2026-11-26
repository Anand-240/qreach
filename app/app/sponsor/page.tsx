"use client";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useIndex } from "@/components/useIndex";
import { CampaignList } from "@/components/CampaignList";
import { Connect } from "@/components/Connect";
import { byNewest, type CampaignRow } from "@/lib/indexer";
import { fmtQusdc } from "@/lib/format";

const FILTERS = [
  ["All", () => true],
  ["Open", (c: CampaignRow) => ["Created", "Accepted", "Submitted"].includes(c.status)],
  ["Paid", (c: CampaignRow) => c.status === "Paid"],
  ["Refunded", (c: CampaignRow) => c.status === "Refunded" || c.status === "Declined"],
] as const;

export default function SponsorPage() {
  const { address } = useAccount();
  const idx = useIndex();
  const [f, setF] = useState(0);
  const mine = address && idx.data ? [...idx.data.campaigns.values()].filter((c) => c.sponsor.toLowerCase() === address.toLowerCase()).sort(byNewest) : [];
  const rows = mine.filter(FILTERS[f][1]);
  const locked = mine.filter(FILTERS[1][1]).reduce((s, c) => s + c.amount, 0n);
  const paid = mine.filter(FILTERS[2][1]).reduce((s, c) => s + c.amount, 0n);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="kicker">Sponsor</p>
          <h1 className="h1">My campaigns</h1>
        </div>
        <Link href="/sponsor/new" className="btn btn-pink btn-lg">+ Hire a creator</Link>
      </div>
      {!address ? (
        <div className="bx flex flex-wrap items-center gap-4 p-6">
          <p className="font-bold">Connect your wallet to see the campaigns you funded.</p>
          <Connect />
        </div>
      ) : idx.isLoading ? (
        <div className="bx flex items-center gap-3 p-6 font-bold"><span className="spinner" /> Reading campaigns from the chain...</div>
      ) : idx.isError ? (
        <div className="bx flex items-center gap-3 bg-red p-6 font-bold text-white">Could not read the chain. <button className="btn btn-sm btn-white" onClick={() => idx.refetch()}>Retry</button></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bx p-4"><div className="display text-3xl">{mine.length}</div><div className="kicker mt-1">Campaigns</div></div>
            <div className="bx bg-yellow p-4"><div className="display text-3xl">{fmtQusdc(locked)}</div><div className="kicker mt-1">QUSDC in escrow</div></div>
            <div className="bx bg-green p-4"><div className="display text-3xl">{fmtQusdc(paid)}</div><div className="kicker mt-1">QUSDC paid</div></div>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist">
            {FILTERS.map(([label], i) => (
              <button key={label} role="tab" aria-selected={f === i} className={`btn btn-sm ${f === i ? "" : "btn-white"}`} onClick={() => setF(i)}>
                {label} ({mine.filter(FILTERS[i][1]).length})
              </button>
            ))}
          </div>
          <CampaignList
            rows={rows}
            role="sponsor"
            empty={mine.length === 0 ? <>You have not funded a campaign yet. <Link className="link font-bold" href="/sponsor/new">Hire your first creator</Link>.</> : "Nothing in this filter."}
          />
        </>
      )}
    </div>
  );
}
