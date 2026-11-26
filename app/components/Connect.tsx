"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useEffect, useRef, useState } from "react";
import { chain } from "@/lib/config";
import { Who } from "./Who";

export function Connect() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => (document.removeEventListener("mousedown", close), document.removeEventListener("keydown", esc));
  }, [open]);

  if (!mounted) return <span className="btn invisible">Connect wallet</span>;

  if (isConnected && address) {
    if (chainId !== chain.id)
      return (
        <button className="btn btn-red" disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
          {switching ? <span className="spinner" /> : null} Switch to {chain.name}
        </button>
      );
    return (
      <div className="flex items-center gap-2">
        <span className="flex min-h-[44px] items-center gap-2 border-[3px] border-ink bg-white px-3">
          <span className="h-2.5 w-2.5 bg-green" aria-hidden />
          <Who addr={address} link={false} />
        </span>
        <button className="btn btn-sm btn-white" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  // EIP-6963 announced wallets appear by name (QIE Wallet). Hide the generic entry when a named one exists.
  const list = connectors.length > 1 ? connectors.filter((c) => c.id !== "injected") : connectors;
  return (
    <div className="relative" ref={ref}>
      <button className="btn" onClick={() => (reset(), setOpen((o) => !o))} disabled={isPending} aria-expanded={open}>
        {isPending ? <><span className="spinner" /> Connecting</> : "Connect wallet"}
      </button>
      {open && (
        <div className="rise absolute right-0 z-50 mt-3 w-72 bx p-2">
          <div className="kicker px-2 pb-2">Choose a wallet</div>
          {list.length === 0 && <p className="px-2 py-2 text-sm">No wallet found in this browser.</p>}
          {list.map((c) => (
            <button
              key={c.uid}
              className="flex w-full items-center gap-3 border-[3px] border-transparent px-2 py-2.5 text-left font-bold hover:border-ink hover:bg-yellow"
              onClick={() => {
                connect({ connector: c, chainId: chain.id });
                setOpen(false);
              }}
            >
              {c.icon ? <img src={c.icon} alt="" className="h-6 w-6" /> : <span className="h-6 w-6 border-2 border-ink bg-lilac" aria-hidden />}
              {c.name === "Injected" ? "Browser wallet" : c.name}
            </button>
          ))}
          <p className="border-t-2 border-ink px-2 pt-2 text-xs">
            No wallet? Install{" "}
            <a className="link" href="https://www.qie.digital/" target="_blank" rel="noreferrer">QIE Wallet</a>, then reload.
          </p>
        </div>
      )}
      {error && !open && (
        <p className="absolute right-0 mt-2 w-64 border-2 border-ink bg-red p-2 text-xs font-bold text-white">
          {/rejected/i.test(error.message) ? "You closed the wallet request." : error.message.split("\n")[0]}
        </p>
      )}
    </div>
  );
}
