"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { nameOf, shortAddr } from "@/lib/qieName";

/** "riya.qie" when the address has a verified .qie name, else 0x1234...abcd. */
export function Who({ addr, link = true }: { addr: Address; link?: boolean }) {
  const { data: name } = useQuery({ queryKey: ["name", addr.toLowerCase()], queryFn: () => nameOf(addr), staleTime: 60_000 });
  const el = (
    <span className={name ? "font-bold" : "mono text-[0.9em]"} title={addr}>
      {name ?? shortAddr(addr)}
    </span>
  );
  return link ? (
    <Link href={`/k/${name ?? addr}`} className="link">
      {el}
    </Link>
  ) : (
    el
  );
}
