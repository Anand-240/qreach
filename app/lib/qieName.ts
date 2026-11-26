import type { Address } from "viem";
import { addresses } from "./config";
import { publicClient } from "./clients";
import { paidPostAbi } from "./abi";

const qieIdAbi = [
  {
    type: "function",
    name: "domainOwnerByName",
    stateMutability: "view",
    inputs: [
      { name: "label", type: "string" },
      { name: "parent", type: "string" },
    ],
    outputs: [{ type: "address" }],
  },
] as const;

/** "Riya.qie" or "riya" -> "riya". Returns null when it cannot be a .qie label. */
export function parseQieLabel(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/\.qie$/, "");
  if (!s || s.length > 64) return null;
  if (!/^[a-z0-9-]+$/.test(s)) return null;
  return s;
}

/** Owner of <label>.qie in the QIE ID registry, or null if the name does not exist. */
export async function resolveQie(label: string): Promise<Address | null> {
  if (!addresses.qieId) return null;
  try {
    const owner = await publicClient.readContract({
      address: addresses.qieId,
      abi: qieIdAbi,
      functionName: "domainOwnerByName",
      args: [label, "qie"],
    });
    return owner === "0x0000000000000000000000000000000000000000" ? null : owner;
  } catch {
    return null; // the registry reverts for unknown names
  }
}

/**
 * The .qie name an address has claimed in PaidPost, re-checked against QIE ID right now.
 * Returns null if none, or if the name has since moved to another owner.
 */
export async function nameOf(addr: Address): Promise<string | null> {
  if (!addresses.paidPost) return null;
  const label = await publicClient
    .readContract({ address: addresses.paidPost, abi: paidPostAbi, functionName: "qieLabelOf", args: [addr] })
    .catch(() => "");
  if (!label) return null;
  const owner = await resolveQie(label);
  return owner && owner.toLowerCase() === addr.toLowerCase() ? `${label}.qie` : null;
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
