"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { qreachAbi } from "@/lib/abi";
import { addresses } from "@/lib/config";
import { nameOf, parseQieLabel, resolveQie } from "@/lib/qieName";
import { useTx } from "./useTx";
import { TxStatus } from "./TxStatus";

export function ClaimName({ address }: { address: Address }) {
  const qc = useQueryClient();
  const current = useQuery({ queryKey: ["name", address.toLowerCase()], queryFn: () => nameOf(address) });
  const [v, setV] = useState("");
  const [editing, setEditing] = useState(false);
  const tx = useTx();
  const label = parseQieLabel(v);
  const owner = useQuery({ queryKey: ["resolve", label], enabled: !!label, queryFn: () => resolveQie(label!) });
  const mine = owner.data && owner.data.toLowerCase() === address.toLowerCase();

  async function link(l: string) {
    if (await tx.send(l ? "Link .qie name" : "Remove .qie name", { address: addresses.qreach!, abi: qreachAbi, functionName: "setQieName", args: [l] })) {
      await qc.invalidateQueries({ queryKey: ["name", address.toLowerCase()] });
      setEditing(false);
      setV("");
    }
  }

  if (current.data && !editing)
    return (
      <div className="bx flex flex-wrap items-center gap-3 bg-lilac p-4">
        <span className="kicker">Sponsors see you as</span>
        <span className="display text-2xl">{current.data}</span>
        <button className="btn btn-sm btn-white ml-auto" onClick={() => setEditing(true)}>Change</button>
        <button className="btn btn-sm btn-white" disabled={tx.busy} onClick={() => link("")}>Remove</button>
        <div className="w-full"><TxStatus state={tx.state} onClose={tx.reset} /></div>
      </div>
    );

  let note = "QREACH checks with QIE ID that your wallet owns the name.";
  if (v && !label) note = "Only letters, numbers and hyphens.";
  else if (label && owner.isLoading) note = "Checking QIE ID...";
  else if (label && owner.data === null) note = `${label}.qie is not registered.`;
  else if (label && owner.data && !mine) note = `${label}.qie belongs to another wallet.`;
  else if (label && mine) note = `${label}.qie is yours.`;

  return (
    <div className="bx space-y-2 bg-lilac p-4">
      <label className="label" htmlFor="qie">Show your .qie name instead of 0x...</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input id="qie" className="input" placeholder="riya.qie" value={v} onChange={(e) => setV(e.target.value)} autoComplete="off" />
        <button className="btn btn-blue" disabled={!mine || tx.busy || !addresses.qreach} onClick={() => link(label!)}>
          Link name
        </button>
        {editing && <button className="btn btn-white" onClick={() => setEditing(false)}>Cancel</button>}
      </div>
      <p className="hint text-ink">{note}</p>
      <TxStatus state={tx.state} onClose={tx.reset} />
    </div>
  );
}
