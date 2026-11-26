"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { erc20Abi, formatEther, isAddress, parseEventLogs, parseUnits, type Address } from "viem";
import { paidPostAbi, mockQusdcAbi } from "@/lib/abi";
import { addresses, isMainnet } from "@/lib/config";
import { parseQieLabel, resolveQie, shortAddr } from "@/lib/qieName";
import { qieNeededFor, qiePrice } from "@/lib/oracle";
import { publicClient } from "@/lib/clients";
import { fmtQusdc, fmtDate } from "@/lib/format";
import { useTx } from "@/components/useTx";
import { TxStatus } from "@/components/TxStatus";
import { Connect } from "@/components/Connect";
import { useChainNow } from "@/components/useChainNow";

const DAY = 86400;
const mockRouterAbi = [
  { type: "function", name: "weiPerUnit", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

function useCreator(input: string) {
  const v = input.trim();
  const label = isAddress(v) ? null : parseQieLabel(v);
  const q = useQuery({ queryKey: ["resolve", label], enabled: !!label, queryFn: () => resolveQie(label!) });
  if (!v) return { addr: undefined, note: "Their .qie name or wallet address.", ok: false };
  if (isAddress(v)) return { addr: v as Address, note: "Wallet address.", ok: true };
  if (!label) return { addr: undefined, note: "Enter a .qie name like riya.qie, or a 0x address.", ok: false };
  if (q.isLoading) return { addr: undefined, note: "Looking up the name in QIE ID...", ok: false };
  if (!q.data) return { addr: undefined, note: `${label}.qie is not registered.`, ok: false };
  return { addr: q.data, note: `${label}.qie = ${shortAddr(q.data)}`, ok: true, name: `${label}.qie` };
}

const reviewLabel = (h: number) => (h === 1 ? "1 hour" : `${h / 24} day${h > 24 ? "s" : ""}`);

export default function NewCampaign() {
  const router = useRouter();
  const { address } = useAccount();
  const [creatorIn, setCreatorIn] = useState("");
  const [amountIn, setAmountIn] = useState("2");
  const [pay, setPay] = useState<"QUSDC" | "QIE">("QUSDC");
  const [acceptDays, setAcceptDays] = useState(2);
  const [deliverDays, setDeliverDays] = useState(5);
  const [reviewH, setReviewH] = useState(24);
  const [brief, setBrief] = useState("");
  const tx = useTx();
  const now = useChainNow();
  // Prefill from a profile's "Hire this creator" link (/sponsor/new?to=riya.qie).
  useEffect(() => {
    const to = new URLSearchParams(window.location.search).get("to");
    if (to) setCreatorIn(to);
  }, []);

  const creator = useCreator(creatorIn);
  const amount = useMemo(() => {
    try {
      return parseUnits(amountIn || "0", 6);
    } catch {
      return 0n;
    }
  }, [amountIn]);
  const acceptBy = now + acceptDays * DAY;
  const deliverBy = now + deliverDays * DAY;

  const pp = addresses.paidPost;
  const qusdc = addresses.qusdc;
  const bal = useReadContract({
    address: qusdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!qusdc },
  });
  const allowance = useReadContract({
    address: qusdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && pp ? [address, pp] : undefined,
    query: { enabled: !!address && !!qusdc && !!pp },
  });
  const price = useQuery({ queryKey: ["qiePrice"], queryFn: qiePrice, refetchInterval: 60_000 });
  const qieNeed = useQuery({
    queryKey: ["qieNeed", String(amount)],
    enabled: pay === "QIE" && amount > 0n && !!pp,
    queryFn: async () => {
      if (isMainnet) return qieNeededFor(amount);
      const r = await publicClient.readContract({ address: pp!, abi: paidPostAbi, functionName: "router" });
      const w = await publicClient.readContract({ address: r, abi: mockRouterAbi, functionName: "weiPerUnit" });
      return amount * w;
    },
    refetchInterval: 30_000,
  });
  // 2% headroom for price moves. The contract returns every unused wei in the same transaction.
  const qieValue = qieNeed.data ? (qieNeed.data * 102n) / 100n : undefined;

  const problems: string[] = [];
  if (!pp) problems.push("The contract address is not configured.");
  if (!creator.ok) problems.push("Choose a creator.");
  if (creator.addr && address && creator.addr.toLowerCase() === address.toLowerCase()) problems.push("You cannot hire yourself.");
  if (amount < 500_000n) problems.push("The minimum is 0.5 QUSDC.");
  if (deliverDays <= acceptDays) problems.push("The posting deadline must be after the accept deadline.");
  if (new TextEncoder().encode(brief).length > 500) problems.push("The brief is too long.");
  if (!brief.trim()) problems.push("Write a short brief.");
  if (pay === "QUSDC" && bal.data !== undefined && bal.data < amount) problems.push("Not enough QUSDC in your wallet.");
  if (pay === "QIE" && !qieValue) problems.push(qieNeed.isError ? "QIEDEX quote failed. Try again." : "Waiting for a QIEDEX quote.");
  if (!now) problems.push("Reading the chain clock...");

  async function submit() {
    if (!pp || !creator.addr) return;
    const common = [creator.addr, amount, BigInt(acceptBy), BigInt(deliverBy), reviewH * 3600, brief.trim()] as const;
    let receipt;
    if (pay === "QUSDC") {
      if ((allowance.data ?? 0n) < amount) {
        const ok = await tx.send("Approve QUSDC (step 1 of 2)", { address: qusdc!, abi: erc20Abi, functionName: "approve", args: [pp, amount] });
        if (!ok) return;
        await allowance.refetch();
      }
      receipt = await tx.send("Lock QUSDC", { address: pp, abi: paidPostAbi, functionName: "createCampaign", args: [...common] });
    } else {
      receipt = await tx.send("Pay with QIE", {
        address: pp,
        abi: paidPostAbi,
        functionName: "createCampaignWithQIE",
        args: [...common, BigInt(now + 900)],
        value: qieValue!,
      });
    }
    if (receipt) {
      const ev = parseEventLogs({ abi: paidPostAbi, logs: receipt.logs, eventName: "CampaignCreated" })[0];
      bal.refetch();
      if (ev) router.push(`/c/${ev.args.id}`);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="kicker">Sponsor</p>
        <h1 className="h1">Hire a creator</h1>
        <p className="max-w-2xl text-lg">
          Your QUSDC stays locked in the contract until the creator delivers. If they do not accept or do not post in
          time, you get all of it back.
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {!isMainnet && address && <TestFaucet address={address} onDone={() => (bal.refetch(), allowance.refetch())} />}

          <div className="bx space-y-6 p-5 sm:p-6">
            <div>
              <label className="label" htmlFor="creator">1. Creator</label>
              <input id="creator" className="input" placeholder="riya.qie or 0x..." value={creatorIn} onChange={(e) => setCreatorIn(e.target.value)} autoComplete="off" />
              <p className={`hint ${creator.ok ? "font-bold text-ink" : ""}`}>{creator.note}</p>
            </div>

            <div>
              <label className="label" htmlFor="amount">2. Amount (QUSDC = US dollars)</label>
              <div className="flex">
                <span className="flex items-center border-[3px] border-r-0 border-ink bg-yellow px-3 font-bold">$</span>
                <input id="amount" className="input" inputMode="decimal" value={amountIn} onChange={(e) => setAmountIn(e.target.value.replace(/[^0-9.]/g, ""))} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["1", "2", "5", "10"].map((v) => (
                  <button key={v} type="button" className={`btn btn-sm ${amountIn === v ? "" : "btn-white"}`} onClick={() => setAmountIn(v)}>
                    {v} QUSDC
                  </button>
                ))}
              </div>
              {bal.data !== undefined && <p className="hint">Your balance: {fmtQusdc(bal.data)} QUSDC</p>}
            </div>

            <fieldset>
              <legend className="label">3. Pay with</legend>
              <div className="grid grid-cols-2 gap-3">
                {(["QUSDC", "QIE"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPay(p)} className={`btn ${pay === p ? "btn-blue" : "btn-white"}`} aria-pressed={pay === p}>
                    {p}
                  </button>
                ))}
              </div>
              {pay === "QIE" && (
                <p className="hint">
                  {qieValue
                    ? `You send up to ${Number(formatEther(qieValue)).toFixed(3)} QIE. QIEDEX swaps it to exactly ${fmtQusdc(amount)} QUSDC; the rest comes back in the same transaction.`
                    : "Getting a quote from QIEDEX..."}
                  {price.data && <> QIE oracle: ${price.data.usd.toFixed(4)} as of {fmtDate(price.data.updatedAt)}{!price.data.fresh && " (old)"}.</>}
                </p>
              )}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="acc">4. Accept within</label>
                <select id="acc" className="input" value={acceptDays} onChange={(e) => setAcceptDays(Number(e.target.value))}>
                  {[1, 2, 3, 7].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="del">Post within</label>
                <select id="del" className="input" value={deliverDays} onChange={(e) => setDeliverDays(Number(e.target.value))}>
                  {[2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="rev">Your review time</label>
                <select id="rev" className="input" value={reviewH} onChange={(e) => setReviewH(Number(e.target.value))}>
                  {[1, 24, 72].map((h) => <option key={h} value={h}>{reviewLabel(h)}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="brief">5. Brief</label>
              <textarea id="brief" className="input min-h-28" maxLength={500} placeholder="One post on X about TechFest 2026 with the registration link." value={brief} onChange={(e) => setBrief(e.target.value)} />
              <p className="hint">Public: stored on chain with the campaign. {brief.length}/500</p>
            </div>
          </div>
        </div>

        {/* Live receipt */}
        <aside className="bx sticky top-28 space-y-4 bg-yellow p-5">
          <div className="kicker">Your offer</div>
          <div className="display text-5xl">{fmtQusdc(amount)}</div>
          <div className="kicker -mt-2">QUSDC locked</div>
          <dl className="space-y-2 border-t-[3px] border-ink pt-3 text-sm">
            <div className="flex justify-between gap-3"><dt>Creator</dt><dd className="font-bold">{creator.ok ? creator.name ?? shortAddr(creator.addr!) : "-"}</dd></div>
            <div className="flex justify-between gap-3"><dt>Paid in</dt><dd className="font-bold">{pay}</dd></div>
            <div className="flex justify-between gap-3"><dt>Accept by</dt><dd className="font-bold">{now ? fmtDate(acceptBy) : "..."}</dd></div>
            <div className="flex justify-between gap-3"><dt>Post by</dt><dd className="font-bold">{now ? fmtDate(deliverBy) : "..."}</dd></div>
            <div className="flex justify-between gap-3"><dt>Your review</dt><dd className="font-bold">{reviewLabel(reviewH)}</dd></div>
          </dl>
          <p className="text-xs">If you do not review a submitted post within {reviewLabel(reviewH)}, anyone can release the payment to the creator.</p>
          {!address ? (
            <div className="space-y-2">
              <p className="text-sm font-bold">Connect a wallet to send the offer.</p>
              <Connect />
            </div>
          ) : (
            <>
              {problems.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {problems.map((p) => <li key={p} className="flex gap-2"><span aria-hidden>-</span>{p}</li>)}
                </ul>
              )}
              <button className="btn btn-pink btn-lg w-full" disabled={problems.length > 0 || tx.busy} onClick={submit}>
                {tx.busy ? <><span className="spinner" /> Working</> : `Lock ${fmtQusdc(amount)} QUSDC`}
              </button>
              {pay === "QUSDC" && (allowance.data ?? 0n) < amount && <p className="text-xs">Two wallet steps: approve QUSDC, then lock it.</p>}
            </>
          )}
          <TxStatus state={tx.state} onClose={tx.reset} />
        </aside>
      </div>
    </div>
  );
}

function TestFaucet({ address, onDone }: { address: Address; onDone: () => void }) {
  const tx = useTx();
  return (
    <div className="bx-flat flex flex-wrap items-center justify-between gap-3 border-dashed bg-white p-4 text-sm">
      <span className="font-bold">Test network: get free test QUSDC to try the flow.</span>
      <button
        className="btn btn-sm btn-green"
        disabled={tx.busy}
        onClick={async () => {
          if (await tx.send("Mint 100 test QUSDC", { address: addresses.qusdc!, abi: mockQusdcAbi, functionName: "mint", args: [address, 100_000_000n] })) onDone();
        }}
      >
        Mint 100 test QUSDC
      </button>
      <div className="w-full"><TxStatus state={tx.state} onClose={tx.reset} /></div>
    </div>
  );
}
