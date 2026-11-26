import { parseEventLogs, type Address, type Hash, type Log } from "viem";
import { qreachAbi } from "./abi";
import { addresses, DEPLOY_BLOCK, LOG_SPAN } from "./config";
import { publicClient } from "./clients";

export type Status = "Created" | "Accepted" | "Submitted" | "Paid" | "Refunded" | "Declined";

export type CampaignRow = {
  id: bigint;
  sponsor: Address;
  creator: Address;
  amount: bigint;
  acceptBy: number;
  deliverBy: number;
  reviewWindow: number;
  brief: string;
  status: Status;
  url?: string;
  postHash?: Hash;
  paidAt?: number;
  autoReleased?: boolean;
  tx: Partial<Record<"created" | "accepted" | "submitted" | "paid" | "refunded" | "declined", Hash>>;
};

export type Index = {
  campaigns: Map<string, CampaignRow>;
  toBlock: bigint;
  /** "txHash:logIndex" of every applied log, so re-scanned blocks are never applied twice. */
  seen: Set<string>;
};

/** Blocks re-read on every refresh, in case the RPC served logs late. */
const OVERLAP = 20n;

let cache: Index | null = null;
let inflight: Promise<Index> | null = null;

async function fetchLogs(from: bigint, to: bigint): Promise<Log[]> {
  const ranges: [bigint, bigint][] = [];
  for (let a = from; a <= to; a += LOG_SPAN + 1n) ranges.push([a, a + LOG_SPAN > to ? to : a + LOG_SPAN]);
  const out: Log[] = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < ranges.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      ranges.slice(i, i + CONCURRENCY).map(([a, b]) =>
        publicClient.getLogs({ address: addresses.qreach!, fromBlock: a, toBlock: b }),
      ),
    );
    for (const b of batch) out.push(...b);
  }
  return out;
}

function apply(idx: Index, logs: Log[]) {
  const fresh = logs.filter((l) => {
    const k = `${l.transactionHash}:${l.logIndex}`;
    if (idx.seen.has(k)) return false;
    idx.seen.add(k);
    return true;
  });
  const events = parseEventLogs({ abi: qreachAbi, logs: fresh });
  for (const ev of events) {
    const tx = ev.transactionHash as Hash;
    const args = ev.args as Record<string, unknown>;
    const key = args.id !== undefined ? String(args.id) : "";
    const c = idx.campaigns.get(key);
    switch (ev.eventName) {
      case "CampaignCreated": {
        const a = ev.args;
        idx.campaigns.set(String(a.id), {
          id: a.id,
          sponsor: a.sponsor,
          creator: a.creator,
          amount: a.amount,
          acceptBy: Number(a.acceptBy),
          deliverBy: Number(a.deliverBy),
          reviewWindow: Number(a.reviewWindow),
          brief: a.brief,
          status: "Created",
          tx: { created: tx },
        });
        break;
      }
      case "Accepted":
        if (c) ((c.status = "Accepted"), (c.tx.accepted = tx));
        break;
      case "Declined":
        if (c) ((c.status = "Declined"), (c.tx.declined = tx));
        break;
      case "WorkSubmitted":
        if (c) {
          c.status = "Submitted";
          c.url = ev.args.url;
          c.postHash = ev.args.postHash;
          c.tx.submitted = tx;
        }
        break;
      case "PaidPromotion":
        if (c) {
          c.status = "Paid";
          c.paidAt = Number(ev.args.paidAt);
          c.autoReleased = ev.args.autoReleased;
          c.tx.paid = tx;
        }
        break;
      case "Refunded":
        if (c) {
          if (c.status !== "Declined") c.status = "Refunded";
          c.tx.refunded = tx;
        }
        break;
    }
  }
}

/**
 * Every QREACH campaign, rebuilt from chain logs. Incremental after the first call.
 * Pass `minBlock` (a receipt's block) to make sure the result includes that block.
 */
export async function loadIndex(minBlock?: bigint): Promise<Index> {
  if (!addresses.qreach) return { campaigns: new Map(), toBlock: 0n, seen: new Set() };
  if (inflight) {
    const r = await inflight;
    if (minBlock === undefined || r.toBlock >= minBlock) return r;
  }
  inflight = (async () => {
    const head = await publicClient.getBlockNumber({ cacheTime: 0 });
    const idx = cache ?? { campaigns: new Map(), toBlock: DEPLOY_BLOCK - 1n, seen: new Set<string>() };
    const from = idx.toBlock + 1n - OVERLAP > DEPLOY_BLOCK ? idx.toBlock + 1n - OVERLAP : DEPLOY_BLOCK;
    if (head >= from) {
      const logs = await fetchLogs(from, head);
      logs.sort((x, y) =>
        x.blockNumber === y.blockNumber
          ? Number(x.logIndex) - Number(y.logIndex)
          : Number(x.blockNumber! - y.blockNumber!),
      );
      apply(idx, logs);
      if (head > idx.toBlock) idx.toBlock = head;
    }
    cache = idx;
    // A new wrapper each time so React Query sees a change and re-renders.
    return { ...idx, campaigns: new Map(idx.campaigns) };
  })().finally(() => (inflight = null));
  return inflight;
}

export type Totals = { campaigns: number; paidCount: number; paidCreators: number; qusdcPaid: bigint; sponsors: number };

export function totals(idx: Index): Totals {
  let qusdcPaid = 0n;
  let paidCount = 0;
  const creators = new Set<string>();
  const sponsors = new Set<string>();
  for (const c of idx.campaigns.values()) {
    sponsors.add(c.sponsor.toLowerCase());
    if (c.status === "Paid") {
      paidCount++;
      qusdcPaid += c.amount;
      creators.add(c.creator.toLowerCase());
    }
  }
  return { campaigns: idx.campaigns.size, paidCount, paidCreators: creators.size, qusdcPaid, sponsors: sponsors.size };
}

export const byNewest = (a: CampaignRow, b: CampaignRow) => Number(b.id - a.id);
