"use client";
import { txUrl } from "@/lib/config";
import type { TxState } from "./useTx";

export function TxStatus({ state, onClose }: { state: TxState; onClose?: () => void }) {
  if (state.s === "idle") return null;
  const link = "hash" in state ? txUrl(state.hash) : undefined;
  const bg = state.s === "error" ? "bg-red text-white shake" : state.s === "done" ? "bg-green" : "bg-yellow";
  return (
    <div role="status" className={`rise mt-4 flex items-start gap-3 border-[3px] border-ink p-3 text-sm font-bold ${bg}`}>
      {(state.s === "wallet" || state.s === "pending") && <span className="spinner mt-0.5 shrink-0" aria-hidden />}
      <div className="flex-1">
        {state.s === "wallet" && <>Confirm &quot;{state.label}&quot; in your wallet.</>}
        {state.s === "pending" && <>{state.label}: waiting for the block...</>}
        {state.s === "done" && <>{state.label}: done.</>}
        {state.s === "error" && <>{state.label} failed. {state.error}</>}
        {link && (
          <>
            {" "}
            <a className="link" href={link} target="_blank" rel="noreferrer">
              View on explorer
            </a>
          </>
        )}
      </div>
      {onClose && (state.s === "done" || state.s === "error") && (
        <button className="shrink-0 border-2 border-current px-1.5 text-xs" onClick={onClose} aria-label="Dismiss">
          X
        </button>
      )}
    </div>
  );
}
