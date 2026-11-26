import Link from "next/link";
import { addresses, addrUrl, chain } from "@/lib/config";

export function Footer() {
  const pp = addresses.paidPost;
  const url = pp ? addrUrl(pp) : undefined;
  return (
    <footer className="mt-10 border-t-[3px] border-ink bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm">
        <span className="display text-lg text-yellow">PaidPost</span>
        <span className="mono text-xs">No owner. No fees. MIT.</span>
        <span className="mono text-xs">Network: {chain.name}</span>
        {pp && (
          <span className="mono text-xs">
            Contract:{" "}
            {url ? (
              <a className="link" href={url} target="_blank" rel="noreferrer">
                {pp.slice(0, 10)}...
              </a>
            ) : (
              `${pp.slice(0, 10)}...`
            )}
          </span>
        )}
        <Link href="/judge" className="link ml-auto mono text-xs">
          How it works / for judges
        </Link>
      </div>
    </footer>
  );
}
