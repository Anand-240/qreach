"use client";
import { useIndex } from "./useIndex";
import { totals, byNewest } from "@/lib/indexer";
import { fmtQusdc, plural } from "@/lib/format";
import { addresses } from "@/lib/config";

/** A live strip of real numbers from the contract. Hidden until there is data. */
export function Ticker() {
  const { data } = useIndex();
  if (!addresses.paidPost || !data) return <div className="h-[39px] border-b-[3px] border-ink bg-pink" aria-hidden />;
  const t = totals(data);
  const recent = [...data.campaigns.values()].filter((c) => c.status === "Paid").sort(byNewest).slice(0, 5);
  const items = [
    plural(t.campaigns, "campaign", "campaigns"),
    `${plural(t.paidCount, "paid post", "paid posts")} disclosed`,
    `${fmtQusdc(t.qusdcPaid)} QUSDC paid to creators`,
    `${plural(t.paidCreators, "creator", "creators")} paid`,
    ...recent.map((c) => `#${c.id}: ${fmtQusdc(c.amount)} QUSDC paid for a post`),
    "every paid post, on the record",
  ];
  const row = (
    <div className="flex shrink-0 items-center">
      {items.map((s, i) => (
        <span key={i} className="flex items-center whitespace-nowrap px-5 text-sm font-bold uppercase mono">
          {s}
          <span className="ml-10 inline-block h-2.5 w-2.5 rotate-45 bg-ink" aria-hidden />
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative h-[39px] w-full overflow-hidden border-b-[3px] border-ink bg-pink [contain:strict]" aria-label="Live numbers from the contract">
      <div className="marquee absolute left-0 top-0 h-full items-center">
        {row}
        <div aria-hidden className="flex">{row}</div>
      </div>
    </div>
  );
}
