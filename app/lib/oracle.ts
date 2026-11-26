import { formatUnits, type Address } from "viem";
import { MAINNET, addresses } from "./config";
import { mainnetClient, publicClient } from "./clients";
import { isMainnet } from "./config";

const aggAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

const routerAbi = [
  { type: "function", name: "WETH", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "getAmountsIn",
    stateMutability: "view",
    inputs: [
      { name: "amountOut", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ type: "uint256[]" }],
  },
] as const;

export const MAX_ORACLE_AGE_S = 6 * 3600;

export type QiePrice = { usd: number; updatedAt: number; fresh: boolean };

/** QIE/USD from the QIE oracle on mainnet (8 decimals). */
export async function qiePrice(): Promise<QiePrice | null> {
  try {
    const [, answer, , updatedAt] = await mainnetClient.readContract({
      address: MAINNET.qieUsd,
      abi: aggAbi,
      functionName: "latestRoundData",
    });
    if (answer <= 0n) return null;
    const t = Number(updatedAt);
    return { usd: Number(formatUnits(answer, 8)), updatedAt: t, fresh: Date.now() / 1000 - t < MAX_ORACLE_AGE_S };
  } catch {
    return null;
  }
}

/** Exact QIE (wei) the QIEDEX router needs today to output `qusdcUnits`. Mainnet only. */
export async function qieNeededFor(qusdcUnits: bigint): Promise<bigint | null> {
  if (!isMainnet || !addresses.qusdc) return null;
  try {
    const router = MAINNET.router as Address;
    const wqie = await publicClient.readContract({ address: router, abi: routerAbi, functionName: "WETH" });
    const amounts = await publicClient.readContract({
      address: router,
      abi: routerAbi,
      functionName: "getAmountsIn",
      args: [qusdcUnits, [wqie, addresses.qusdc]],
    });
    return amounts[0];
  } catch {
    return null;
  }
}
