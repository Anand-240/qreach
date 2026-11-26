"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { keccak256, toBytes } from "viem";
import { CheckBox } from "@/components/CheckBox";
import { Who } from "@/components/Who";
import { normalizeUrl } from "@/lib/normalizeUrl";
import { publicClient } from "@/lib/clients";
import { paidPostAbi } from "@/lib/abi";
import { addresses, txUrl } from "@/lib/config";
import { fmtDate, fmtQusdc } from "@/lib/format";
import { loadIndex } from "@/lib/indexer";
import { STATUS_BY_INDEX } from "@/lib/campaign";

function CopyLink() {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-sm btn-white"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt("Copy this link", window.location.href);
        }
      }}
    >
      {done ? "Copied" : "Copy result link"}
    </button>
  );
}

export default function CheckClient() {
  const u = useSearchParams().get("u") ?? "";
  const norm = u ? normalizeUrl(u) : null;
  const hash = norm?.ok ? keccak256(toBytes(norm.url)) : undefined;

  const q = useQuery({
    queryKey: ["disclosure", hash],
    enabled: !!hash && !!addresses.paidPost,
    queryFn: async () => {
      const [id, sponsor, creator, amount, paidAt, status] = await publicClient.readContract({
        address: addresses.paidPost!,
        abi: paidPostAbi,
        functionName: "disclosureOf",
        args: [hash!],
      });
      const row = id > 0n ? (await loadIndex()).campaigns.get(String(id)) : undefined;
      return { id, sponsor, creator, amount, paidAt: Number(paidAt), status: STATUS_BY_INDEX[status], row };
    },
  });
  const d = q.data;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <p className="kicker">Public lookup</p>
        <h1 className="h1">Is this post paid?</h1>
        <p className="text-lg">
          Paste a link to an X, Instagram, YouTube or LinkedIn post. Share links, tracking codes and photo suffixes are
          cleaned first, so any copy of the same post gives the same answer.
        </p>
      </div>
      <CheckBox key={u} initial={u} />

      {norm && !norm.ok && <div className="bx shake bg-red p-4 font-bold text-white">{norm.error}</div>}
      {norm?.ok && (
        <p className="mono break-all text-xs">
          Looked up as: <b>{norm.url}</b>
        </p>
      )}
      {!addresses.paidPost && hash && <div className="bx bg-yellow p-4 font-bold">The contract address is not configured.</div>}
      {q.isLoading && (
        <div className="bx flex items-center gap-3 p-6 font-bold">
          <span className="spinner" /> Reading the chain...
        </div>
      )}
      {q.isError && (
        <div className="bx flex flex-wrap items-center gap-3 bg-red p-6 font-bold text-white">
          Could not reach the QIE network.
          <button className="btn btn-sm btn-white" onClick={() => q.refetch()}>Try again</button>
        </div>
      )}

      {d && d.status === "Paid" && (
        <div className="bx rise relative bg-yellow p-6 sm:p-8">
          <span className="stamp display absolute -top-7 right-4 border-[5px] border-red bg-white px-4 py-1 text-4xl text-red sm:text-5xl">
            Paid
          </span>
          <div className="kicker">Paid promotion</div>
          <p className="mt-4 text-2xl leading-snug sm:text-3xl">
            <Who addr={d.creator} /> was paid <b className="display">{fmtQusdc(d.amount)} QUSDC</b> by <Who addr={d.sponsor} /> for
            this post.
          </p>
          <p className="mono mt-3 text-sm">
            Paid {fmtDate(d.paidAt)}
            {d.row?.autoReleased ? " / released automatically after the review time" : " / approved by the sponsor"}
          </p>
          {d.row?.brief && (
            <blockquote className="mt-5 border-l-[6px] border-ink bg-white p-3">
              <div className="kicker mb-1">The brief</div>
              {d.row.brief}
            </blockquote>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="btn btn-sm btn-white" href={`/c/${d.id}`}>Campaign #{String(d.id)}</Link>
            {d.row?.tx.paid && txUrl(d.row.tx.paid) && (
              <a className="btn btn-sm btn-white" href={txUrl(d.row.tx.paid)} target="_blank" rel="noreferrer">Payment on explorer</a>
            )}
            <CopyLink />
          </div>
        </div>
      )}

      {d && d.status === "Submitted" && (
        <div className="bx rise bg-sky p-6 sm:p-8">
          <div className="kicker">Paid deal / payment pending</div>
          <p className="mt-4 text-2xl">
            This post was submitted for a paid campaign by <Who addr={d.sponsor} />. {fmtQusdc(d.amount)} QUSDC is still in escrow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="btn btn-sm btn-white" href={`/c/${d.id}`}>Campaign #{String(d.id)}</Link>
            <CopyLink />
          </div>
        </div>
      )}

      {d && d.id === 0n && (
        <div className="bx rise bg-white p-6 sm:p-8">
          <div className="kicker">No PaidPost record</div>
          <p className="mt-4 text-2xl">This post was not paid through PaidPost.</p>
          <p className="mt-2">That does not prove it is unpaid: deals made elsewhere leave no record here.</p>
        </div>
      )}

      {!u && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Paid", "A sponsor paid the creator for this exact post. You see who, how much and when.", "bg-yellow"],
            ["Pending", "The post is part of a paid deal and the money is still in escrow.", "bg-sky"],
            ["No record", "Nothing was paid for this post through PaidPost.", "bg-white"],
          ].map(([h, b, bg], i) => (
            <div key={h} className={`bx rise p-5 ${bg}`} style={{ "--i": i } as React.CSSProperties}>
              <div className="display text-xl">{h}</div>
              <p className="mt-2 text-sm">{b}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
