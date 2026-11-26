"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { paidPostAbi } from "@/lib/abi";
import { addresses, txUrl } from "@/lib/config";
import { STATUS_BY_INDEX, nextActions, shownStatus } from "@/lib/campaign";
import { fmtDate, fmtLeft, fmtQusdc } from "@/lib/format";
import { normalizeUrl } from "@/lib/normalizeUrl";
import type { Status } from "@/lib/indexer";
import { useIndex } from "@/components/useIndex";
import { useTx } from "@/components/useTx";
import { TxStatus } from "@/components/TxStatus";
import { Who } from "@/components/Who";
import { StatusChip } from "@/components/StatusChip";
import { Connect } from "@/components/Connect";
import { useChainNow } from "@/components/useChainNow";

const dur = (s: number) => (s >= 86400 ? `${s / 86400} day(s)` : `${s / 3600} hour(s)`);

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = use(params);
  const id = /^\d{1,30}$/.test(idStr) ? BigInt(idStr) : 0n;
  const { address } = useAccount();
  const qc = useQueryClient();
  const idx = useIndex();
  const tx = useTx();
  const [url, setUrl] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const now = useChainNow();

  const live = useReadContract({
    address: addresses.paidPost,
    abi: paidPostAbi,
    functionName: "getCampaign",
    args: [id],
    query: { enabled: !!addresses.paidPost && id > 0n, refetchInterval: 15_000 },
  });
  const c = live.data;
  const row = idx.data?.campaigns.get(String(id));

  if (!addresses.paidPost) return <div className="bx bg-yellow p-6 font-bold">The contract address is not configured.</div>;
  if (live.isLoading || (id > 0n && !c && !live.isError))
    return <div className="bx flex items-center gap-3 p-6 font-bold"><span className="spinner" /> Loading campaign #{idStr}...</div>;
  if (live.isError)
    return <div className="bx flex items-center gap-3 bg-red p-6 font-bold text-white">Could not read the chain. <button className="btn btn-sm btn-white" onClick={() => live.refetch()}>Retry</button></div>;
  if (!c || c.status === 0)
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <div className="display text-6xl">#{idStr.slice(0, 12)}</div>
        <p className="text-lg">This campaign does not exist.</p>
        <Link href="/sponsor" className="btn">My campaigns</Link>
      </div>
    );

  const status = STATUS_BY_INDEX[c.status] as Status;
  const L = { status, acceptBy: Number(c.acceptBy), deliverBy: Number(c.deliverBy), submittedAt: Number(c.submittedAt), reviewWindow: Number(c.reviewWindow) };
  const a = nextActions(L, now || 0);
  const me = address?.toLowerCase();
  const isSponsor = me === c.sponsor.toLowerCase();
  const isCreator = me === c.creator.toLowerCase();
  const norm = url ? normalizeUrl(url) : null;
  const role = isSponsor ? "the sponsor" : isCreator ? "the creator" : null;

  async function act(label: string, functionName: string, args: readonly unknown[]) {
    setConfirm(null);
    const r = await tx.send(label, { address: addresses.paidPost!, abi: paidPostAbi, functionName, args });
    if (r) {
      await live.refetch();
      qc.invalidateQueries({ queryKey: ["index"] });
      qc.invalidateQueries({ queryKey: ["chainClockOffset"] });
    }
  }

  const steps = [
    { label: "Offer created, QUSDC locked", done: true, when: undefined as string | undefined, tx: row?.tx.created },
    { label: "Creator accepted", done: ["Accepted", "Submitted", "Paid"].includes(status), tx: row?.tx.accepted },
    { label: "Post submitted", done: ["Submitted", "Paid"].includes(status), when: c.submittedAt ? fmtDate(Number(c.submittedAt)) : undefined, tx: row?.tx.submitted },
    { label: row?.autoReleased ? "Paid (released after review time)" : "Paid and disclosed", done: status === "Paid", when: c.paidAt ? fmtDate(Number(c.paidAt)) : undefined, tx: row?.tx.paid },
  ];
  const reviewLeft = status === "Submitted" && now ? Math.max(0, a.releaseAt - now) : 0;
  const reviewPct = status === "Submitted" && L.reviewWindow ? Math.min(100, 100 - (reviewLeft / L.reviewWindow) * 100) : 0;

  // Two-tap confirmation for actions that move money away from the viewer's side.
  const Danger = ({ k, label, fn }: { k: string; label: string; fn: () => void }) =>
    confirm === k ? (
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">Sure?</span>
        <button className="btn btn-red" disabled={tx.busy} onClick={fn}>Yes, {label.toLowerCase()}</button>
        <button className="btn btn-white" onClick={() => setConfirm(null)}>No</button>
      </span>
    ) : (
      <button className="btn btn-white" disabled={tx.busy} onClick={() => setConfirm(k)}>{label}</button>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">Campaign #{idStr}</h1>
        {now > 0 && <StatusChip status={shownStatus(L, now)} />}
        {role && <span className="tag bg-ink text-yellow">You are {role}</span>}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="bx space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-end gap-2">
            <span className="display text-6xl">{fmtQusdc(c.amount)}</span>
            <span className="kicker pb-2">QUSDC</span>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="kicker">Sponsor</dt><dd className="text-base"><Who addr={c.sponsor} /></dd></div>
            <div><dt className="kicker">Creator</dt><dd className="text-base"><Who addr={c.creator} /></dd></div>
            <div><dt className="kicker">Accept by</dt><dd>{fmtDate(L.acceptBy)}</dd></div>
            <div><dt className="kicker">Post by</dt><dd>{fmtDate(L.deliverBy)}</dd></div>
            <div><dt className="kicker">Sponsor review time</dt><dd>{dur(L.reviewWindow)}</dd></div>
          </dl>
          {row?.brief && (
            <blockquote className="border-l-[6px] border-ink bg-paper p-3">
              <div className="kicker mb-1">Brief</div>
              {row.brief}
            </blockquote>
          )}
          {row?.url && (
            <p className="break-all">
              <span className="kicker mr-2">Post</span>
              <a className="link font-bold" href={row.url} target="_blank" rel="noreferrer noopener">{row.url}</a>
            </p>
          )}
        </div>

        {/* Timeline */}
        {status === "Refunded" || status === "Declined" ? (
          <div className="bx space-y-2 bg-white p-5">
            <div className="display text-2xl">{status === "Declined" ? "Declined" : "Refunded"}</div>
            <p className="text-sm">{status === "Declined" ? "The creator declined. " : ""}The sponsor got the full amount back.</p>
            {row?.tx.refunded && txUrl(row.tx.refunded) && <a className="link text-sm" href={txUrl(row.tx.refunded)} target="_blank" rel="noreferrer">Refund on explorer</a>}
          </div>
        ) : (
          <ol className="bx p-5">
            {steps.map((s, i) => (
              <li key={s.label} className="relative flex gap-3 pb-6 last:pb-0">
                {i < steps.length - 1 && (
                  <span
                    className={`absolute left-[10.5px] top-6 h-[calc(100%-1.5rem)] w-[3px] ${steps[i + 1].done ? "bg-ink" : "bg-ink/15"}`}
                    aria-hidden
                  />
                )}
                <span
                  className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center border-[3px] border-ink text-xs font-bold ${s.done ? "bg-green" : "bg-white"}`}
                  aria-hidden
                >
                  {s.done ? "+" : ""}
                </span>
                <div className="text-sm">
                  <div className={s.done ? "font-bold" : "text-dim"}>{s.label}</div>
                  {s.when && <div className="mono text-xs">{s.when}</div>}
                  {s.tx && txUrl(s.tx) && <a className="link mono text-xs" href={txUrl(s.tx)} target="_blank" rel="noreferrer">tx</a>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Review countdown */}
      {status === "Submitted" && now > 0 && (
        <div className="bx space-y-2 p-5">
          <div className="flex flex-wrap justify-between gap-2 text-sm font-bold">
            <span>Sponsor review time</span>
            <span>{reviewLeft > 0 ? `${fmtLeft(a.releaseAt, now)} until auto release` : "Over: payment can be released"}</span>
          </div>
          <div className="h-5 border-[3px] border-ink bg-white">
            <div className="h-full bg-pink transition-[width] duration-700" style={{ width: `${reviewPct}%` }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-4">
        {!address && status !== "Paid" && status !== "Refunded" && status !== "Declined" && (
          <div className="bx flex flex-wrap items-center gap-4 p-5">
            <p className="font-bold">Are you the sponsor or the creator? Connect to act on this campaign.</p>
            <Connect />
          </div>
        )}

        {isCreator && a.canAccept && (
          <div className="bx space-y-4 bg-sky p-5">
            <p className="font-bold">New offer. Accept by {fmtDate(L.acceptBy)} ({fmtLeft(L.acceptBy, now)}).</p>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-green btn-lg" disabled={tx.busy} onClick={() => act("Accept offer", "accept", [id])}>Accept offer</button>
              <Danger k="decline" label="Decline" fn={() => act("Decline offer", "decline", [id])} />
            </div>
          </div>
        )}
        {isCreator && !a.canAccept && a.canDecline && (
          <div className="bx flex flex-wrap items-center gap-3 p-5">
            <p className="font-bold">The accept deadline passed. You can still decline so the sponsor gets the money back now.</p>
            <Danger k="decline" label="Decline and refund" fn={() => act("Decline offer", "decline", [id])} />
          </div>
        )}
        {isCreator && a.canSubmit && (
          <div className="bx space-y-3 bg-lilac p-5">
            <label className="label" htmlFor="url">Link to your published post</label>
            <input id="url" className="input" inputMode="url" placeholder="https://x.com/you/status/..." value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" />
            {norm && (norm.ok ? <p className="mono break-all text-xs font-bold">Will be recorded as {norm.url}</p> : <p className="text-sm font-bold text-red">{norm.error}</p>)}
            <p className="text-sm">Post by {fmtDate(L.deliverBy)} ({fmtLeft(L.deliverBy, now)}). Keep the post up: the link becomes the public record.</p>
            <button className="btn btn-blue btn-lg" disabled={tx.busy || !norm?.ok} onClick={() => norm?.ok && act("Submit post", "submitWork", [id, norm.url])}>Submit post</button>
          </div>
        )}
        {isCreator && status === "Submitted" && !a.canAutoRelease && (
          <div className="bx p-5 font-bold">Submitted. Waiting for the sponsor to approve, or for the review time to end.</div>
        )}

        {isSponsor && a.canApprove && (
          <div className="bx space-y-3 bg-yellow p-5">
            <p className="font-bold">Check the post, then pay the creator.</p>
            {row?.url && <a className="link mono break-all text-sm" href={row.url} target="_blank" rel="noreferrer noopener">Open the post &gt;</a>}
            <div>
              <button className="btn btn-green btn-lg" disabled={tx.busy} onClick={() => act("Approve and pay", "approveAndPay", [id])}>Approve and pay {fmtQusdc(c.amount)} QUSDC</button>
            </div>
          </div>
        )}
        {isSponsor && a.canCancel && (
          <div className="bx flex flex-wrap items-center gap-3 p-5">
            <p className="font-bold">The creator has not accepted yet. You can cancel and get your QUSDC back.</p>
            <Danger k="cancel" label="Cancel offer" fn={() => act("Cancel offer", "cancel", [id])} />
          </div>
        )}
        {isSponsor && status === "Accepted" && !a.canRefundExpired && (
          <div className="bx p-5 font-bold">The creator accepted. If they do not post by {fmtDate(L.deliverBy)}, you can take the money back.</div>
        )}

        {a.canAutoRelease && (
          <div className="bx space-y-3 bg-green p-5">
            <p className="font-bold">The review time is over. Anyone can now release the payment to the creator.</p>
            <button className="btn btn-lg" disabled={tx.busy || !address} onClick={() => act("Release payment", "autoRelease", [id])}>Release payment to creator</button>
          </div>
        )}
        {a.canRefundExpired && (
          <div className="bx space-y-3 bg-white p-5">
            <p className="font-bold">The {status === "Created" ? "accept" : "posting"} deadline passed. Anyone can return the QUSDC to the sponsor.</p>
            <button className="btn btn-lg" disabled={tx.busy || !address} onClick={() => act("Refund sponsor", "refundExpired", [id])}>Refund sponsor</button>
          </div>
        )}

        {status === "Paid" && row?.url && (
          <div className="bx flex flex-wrap items-center gap-4 bg-green p-5">
            <span className="display text-2xl">Paid and disclosed</span>
            <Link className="btn btn-white" href={`/check?u=${encodeURIComponent(row.url)}`}>See the public record &gt;</Link>
          </div>
        )}
        <TxStatus state={tx.state} onClose={tx.reset} />
      </div>
    </div>
  );
}
