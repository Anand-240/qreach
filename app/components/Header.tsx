"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { chain, isMainnet } from "@/lib/config";
import { Connect } from "./Connect";

const NAV = [
  ["/check", "Check a post"],
  ["/sponsor", "Sponsor"],
  ["/creator", "Creator"],
  ["/judge", "Judges"],
] as const;

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const active = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-paper">
      {!isMainnet && (
        <div className="border-b-[3px] border-ink bg-ink px-4 py-1 text-center text-[11px] font-bold uppercase tracking-widest text-yellow mono">
          {chain.name} / test tokens only / not real money
        </div>
      )}
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="display wiggle inline-block border-[3px] border-ink bg-yellow px-2.5 py-1 text-xl shadow-[4px_4px_0_var(--ink)]">
          Paid<span className="text-pink [-webkit-text-stroke:1.5px_var(--ink)]">Post</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`border-[3px] px-3 py-1.5 text-sm font-bold uppercase transition-colors ${
                active(href) ? "border-ink bg-ink text-yellow" : "border-transparent hover:border-ink hover:bg-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden md:block">
          <Connect />
        </div>
        <button
          className="btn btn-sm btn-white ml-auto md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="rise border-t-[3px] border-ink bg-paper px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.map(([href, label], i) => (
              <Link
                key={href}
                href={href}
                style={{ "--i": i } as React.CSSProperties}
                className={`rise display border-b-[3px] border-ink py-3 text-2xl ${active(href) ? "text-pink" : ""}`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-4">
            <Connect />
          </div>
        </div>
      )}
    </header>
  );
}
