"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAddress, type Address } from "viem";
import { qreachAbi } from "@/lib/abi";
import { addresses, addrUrl } from "@/lib/config";
import { publicClient } from "@/lib/clients";
import { nameOf, parseQieLabel, resolveQie } from "@/lib/qieName";
import { WEIGHTS, shillScore } from "@/lib/score";
import { byNewest } from "@/lib/indexer";
import { fmtDate, fmtQusdc } from "@/lib/format";
import { useIndex } from "@/components/useIndex";
import { Who } from "@/components/Who";

function Bar({ label, weight, value, i }: { label: string; weight: number; value: number; i: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span className="mono">{Math.round(value * weight)} / {weight}</span>
      </div>
      <div className="mt-1 h-4 border-[3px] border-ink bg-white">
        <div className="fill h-full bg-pink" style={{ width: `${value * 100}%`, "--i": i } as React.CSSProperties} />
      </div>
    </div>
  );
}

export default function Profile({ params }: { params: Promise<{ name: string }> }) {
  const raw = decodeURIComponent(use(params).name);
  const [copied, setCopied] = useState(false);
  const who = useQuery({
    queryKey: ["profile", raw],
    queryFn: async (): Promise<{ addr: Address | null; name: string | null }> => {
      if (isAddress(raw)) return { addr: raw, name: await nameOf(raw) };
      const label = parseQieLabel(raw);
      const addr = label ? await resolveQie(label) : null;
      return { addr, name: addr && label ? `${label}.qie` : null };
    },
  });
  const addr = who.data?.addr;
  const stats = useQuery({
    queryKey: ["stats", addr],
    enabled: !!addr && !!addresses.qreach,
    queryFn: () => publicClient.readContract({ address: addresses.qreach!, abi: qreachAbi, functionName: "creatorStats", args: [addr!] }),
  });
  const idx = useIndex();

  if (who.isLoading) return <div className="bx flex items-center gap-3 p-6 font-bold"><span className="spinner" /> Looking up {raw}...</div>;
  if (!addr)
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <div className="display break-all text-4xl">{raw}</div>
        <p className="text-lg">This is not a registered .qie name or a wallet address.</p>
        <Link href="/" className="btn">Home</Link>
      </div>
    );

  const rows = idx.data ? [...idx.data.campaigns.values()].filter((c) => c.creator.toLowerCase() === addr.toLowerCase()).sort(byNewest) : [];
  const paid = rows.filter((c) => c.status === "Paid");
  const uniqueSponsors = new Set(paid.map((c) => c.sponsor.toLowerCase())).size;
  const s = stats.data;
  const score = s ? shillScore({ completed: s.completed, expired: s.expired, uniqueSponsors }) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <p className="kicker">Creator profile</p>
        <h1 className="h1 break-all">{who.data?.name ?? "Creator"}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {addrUrl(addr) ? (
            <a className="link mono break-all text-xs" href={addrUrl(addr)} target="_blank" rel="noreferrer">{addr}</a>
          ) : (
            <span className="mono break-all text-xs">{addr}</span>
          )}
          <button
            className="btn btn-sm btn-white"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                window.prompt("Copy this link", window.location.href);
              }
            }}
          >
            {copied ? "Copied" : "Copy profile link"}
          </button>
          <Link className="btn btn-sm" href={`/sponsor/new?to=${encodeURIComponent(who.data?.name ?? addr)}`}>Hire this creator</Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="bx flex flex-col items-center justify-center bg-yellow p-6 text-center">
          <div className="display text-8xl leading-none">{!score ? <span className="blink">_</span> : score.kind === "new" ? "NEW" : score.score}</div>
          <div className="kicker mt-3">{score?.kind === "scored" ? "Shill Score / 100" : "No finished campaigns yet"}</div>
        </div>
        <div className="bx space-y-4 p-5">
          {score?.kind === "scored" ? (
            <>
              <Bar i={0} label="Delivered (paid posts / all finished jobs)" weight={WEIGHTS.completion} value={score.completionRate} />
              <Bar i={1} label="Experience (paid posts / 10)" weight={WEIGHTS.experience} value={score.experience} />
              <Bar i={2} label="Sponsor variety (sponsors / 5)" weight={WEIGHTS.variety} value={score.sponsorVariety} />
            </>
          ) : (
            <p>The score appears after the first paid post or missed deadline.</p>
          )}
          {s && (
            <dl className="grid grid-cols-2 gap-3 border-t-[3px] border-ink pt-4 text-sm sm:grid-cols-4">
              <div><dt className="kicker">Paid posts</dt><dd className="display text-2xl">{s.completed}</dd></div>
              <div><dt className="kicker">Missed</dt><dd className="display text-2xl">{s.expired}</dd></div>
              <div><dt className="kicker">Sponsors</dt><dd className="display text-2xl">{uniqueSponsors}</dd></div>
              <div><dt className="kicker">Earned</dt><dd className="display text-2xl">{fmtQusdc(s.earned)}</dd></div>
            </dl>
          )}
          <p className="text-xs">Every input is read from the QREACH contract. Nobody can edit it.</p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="display text-2xl">Paid posts</h2>
        {idx.isLoading ? (
          <div className="bx flex items-center gap-3 p-6 font-bold"><span className="spinner" /> Reading the chain...</div>
        ) : paid.length === 0 ? (
          <div className="bx-flat border-dashed p-6 text-sm">No paid posts yet.</div>
        ) : (
          <ul className="space-y-4">
            {paid.map((c, i) => (
              <li key={String(c.id)} className="bx rise space-y-2 p-4" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="display text-xl">{fmtQusdc(c.amount)} <span className="text-sm">QUSDC</span></span>
                  <span className="text-sm">from <Who addr={c.sponsor} /></span>
                  {c.paidAt && <span className="mono text-xs">{fmtDate(c.paidAt)}</span>}
                  <Link className="btn btn-sm btn-white ml-auto" href={`/c/${c.id}`}>#{String(c.id)}</Link>
                </div>
                {c.url && <a className="link mono block break-all text-xs" href={c.url} target="_blank" rel="noreferrer noopener">{c.url}</a>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
