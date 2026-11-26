"use client";
import { useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import type { Abi, Address, Hash, TransactionReceipt } from "viem";

export type WriteReq = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};
import { readableError } from "@/lib/errors";

export type TxState =
  | { s: "idle" }
  | { s: "wallet"; label: string }
  | { s: "pending"; label: string; hash: Hash }
  | { s: "done"; label: string; hash: Hash }
  | { s: "error"; label: string; error: string };

/** Sends one contract call, waits for it, and keeps a readable state for the UI. */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient();
  const { address } = useAccount();
  const [state, setState] = useState<TxState>({ s: "idle" });

  async function send(
    label: string,
    req: WriteReq,
  ): Promise<TransactionReceipt | null> {
    try {
      setState({ s: "wallet", label });
      // Simulate first so a revert shows the contract's reason before the wallet opens.
      if (!client || !address) throw new Error("Connect your wallet first.");
      await client.simulateContract({ ...(req as object), account: address } as never);
      const hash = await writeContractAsync(req as never);
      setState({ s: "pending", label, hash });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The transaction failed on chain.");
      setState({ s: "done", label, hash });
      return receipt;
    } catch (e) {
      setState({ s: "error", label, error: readableError(e) });
      return null;
    }
  }
  const busy = state.s === "wallet" || state.s === "pending";
  return { state, send, busy, reset: () => setState({ s: "idle" }) };
}
