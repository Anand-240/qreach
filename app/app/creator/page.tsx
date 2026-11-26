"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useIndex } from "@/components/useIndex";
import { CampaignList } from "@/components/CampaignList";
import { ClaimName } from "@/components/ClaimName";
import { Connect } from "@/components/Connect";
import { byNewest } from "@/lib/indexer";
import { fmtQusdc } from "@/lib/format";
import { nameOf } from "@/lib/qieName";

export default function CreatorPage() {
  const { address } = useAccount();
  const idx = useIndex();
  const name = useQuery({ queryKey: ["name", address?.toLowerCase()], enabled: !!address, queryFn: () => nameOf(address!) });
  const mine = address && idx.data ? [...idx.data.campaigns.values()].filter((c) => c.creator.toLowerCase() === address.toLowerCase()).sort(byNewest) : [];
  const open = mine.filter((c) => c.status === "Created" || c.status === "Accepted" || c.status === "Submitted");
  const done = mine.filter((c) => !open.includes(c));
  const earned = mine.filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0n);
  const pending = mine.filter((c) => c.status === "Accepted" || c.status === "Submitted").reduce((s, c) => s + c.amount, 0n);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="kicker">Creator</p>
          <h1 className="h1">My offers</h1>
        </div>
        {address && <Link href={`/k/${name.data ?? address}`} className="btn btn-white">My public profile &gt;</Link>}
      </div>
      {!address ? (
        <div className="bx flex flex-wrap items-center gap-4 p-6">
          <p className="font-bold">Connect your wallet to see the offers sponsors sent you.</p>
          <Connect />
        </div>
      ) : (
        <>
          <ClaimName address={address} />
          <div className="grid grid-cols-3 gap-4">
            <div className="bx p-4"><div className="display text-3xl">{open.length}</div><div className="kicker mt-1">Open</div></div>
            <div className="bx bg-yellow p-4"><div className="display text-3xl">{fmtQusdc(pending)}</div><div className="kicker mt-1">QUSDC in progress</div></div>
            <div className="bx bg-green p-4"><div className="display text-3xl">{fmtQusdc(earned)}</div><div className="kicker mt-1">QUSDC earned</div></div>
          </div>
          <section className="space-y-4">
            <h2 className="display text-2xl">Offers and open jobs</h2>
            {idx.isLoading ? (
              <div className="bx flex items-center gap-3 p-6 font-bold"><span className="spinner" /> Reading campaigns from the chain...</div>
            ) : (
              <CampaignList rows={open} role="creator" empty="No open offers. Share your .qie name or wallet address with sponsors." />
            )}
          </section>
          {done.length > 0 && (
            <section className="space-y-4">
              <h2 className="display text-2xl">History</h2>
              <CampaignList rows={done} role="creator" empty="" />
            </section>
          )}
        </>
      )}
    </div>
  );
}
