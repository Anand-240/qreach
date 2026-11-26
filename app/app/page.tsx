"use client";
import Link from "next/link";
import { CheckBox } from "@/components/CheckBox";
import { useIndex } from "@/components/useIndex";
import { Who } from "@/components/Who";
import { byNewest, totals } from "@/lib/indexer";
import { fmtDate, fmtQusdc } from "@/lib/format";
import { addresses } from "@/lib/config";

const STEPS = [
  {
    n: "01",
    h: "Offer",
    b: "Pick a creator by .qie name. Write the brief, set the dates, lock QUSDC. Pay in QIE if you like: QIEDEX swaps it to exact QUSDC in the same transaction.",
    bg: "bg-sky",
  },
  {
    n: "02",
    h: "Post",
    b: "The creator accepts, publishes, and submits the link. One post can back one campaign only. Miss the deadline and the sponsor gets the money back.",
    bg: "bg-lilac",
  },
  {
    n: "03",
    h: "Paid + public",
    b: "The sponsor approves, or anyone releases the money when the review time ends. A PaidPromotion record is written for that post, forever.",
    bg: "bg-green",
  },
];

export default function Home() {
  const { data, isLoading, isError } = useIndex();
  const t = data ? totals(data) : null;
  const latest = data ? [...data.campaigns.values()].filter((c) => c.status === "Paid" && c.url).sort(byNewest)[0] : undefined;

  const stats: [string, string | number | undefined, string][] = [
    ["Campaigns", t?.campaigns, "bg-white"],
    ["Paid posts", t?.paidCount, "bg-yellow"],
    ["Creators paid", t?.paidCreators, "bg-white"],
    ["QUSDC paid out", t ? fmtQusdc(t.qusdcPaid) : undefined, "bg-green"],
  ];

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <p className="kicker rise inline-block border-2 border-ink bg-white px-2 py-1">Creator deals on QIE, in public</p>
          <h1 className="display rise text-[clamp(2.8rem,9vw,6.2rem)]" style={{ "--i": 1 } as React.CSSProperties}>
            Is this
            <br />
            post <span className="bg-pink px-2 [box-decoration-break:clone]">paid?</span>
          </h1>
          <p className="rise max-w-xl text-lg" style={{ "--i": 2 } as React.CSSProperties}>
            Paste any post link. If a sponsor paid for it through PaidPost, you see who paid, how much and when. Read
            straight from the chain.
          </p>
          <div className="rise max-w-2xl" style={{ "--i": 3 } as React.CSSProperties}>
            <CheckBox big />
          </div>
          <div className="rise flex flex-wrap gap-4 pt-2" style={{ "--i": 4 } as React.CSSProperties}>
            <Link href="/sponsor/new" className="btn btn-lg">Hire a creator</Link>
            <Link href="/creator" className="btn btn-lg btn-white">I am a creator</Link>
          </div>
        </div>

        {/* A real record from the chain, or how one looks once there is one */}
        <div className="rise relative" style={{ "--i": 3 } as React.CSSProperties}>
          {latest ? (
            <Link href={`/check?u=${encodeURIComponent(latest.url!)}`} className="bx block rotate-1 bg-white p-6 transition-transform hover:rotate-0">
              <div className="kicker">Latest disclosure</div>
              <p className="mono mt-3 break-all text-sm">{latest.url}</p>
              <p className="mt-4 text-lg">
                <Who addr={latest.creator} link={false} /> got <b className="display">{fmtQusdc(latest.amount)} QUSDC</b> from{" "}
                <Who addr={latest.sponsor} link={false} />
              </p>
              {latest.paidAt && <p className="mono mt-1 text-xs">{fmtDate(latest.paidAt)}</p>}
              <span className="stamp display absolute -right-3 -top-6 border-[4px] border-red bg-white px-3 py-1 text-3xl text-red">
                Paid
              </span>
            </Link>
          ) : (
            <div className="bx rotate-1 bg-white p-6">
              <div className="kicker">What a record looks like</div>
              <div className="mt-4 space-y-3">
                <div className="h-3 w-4/5 bg-ink/15" />
                <div className="h-3 w-3/5 bg-ink/15" />
                <p className="pt-2 text-lg">
                  <b>creator.qie</b> got <b className="display">QUSDC</b> from <b>sponsor.qie</b>
                </p>
              </div>
              <span className="stamp display absolute -right-3 -top-6 border-[4px] border-red bg-white px-3 py-1 text-3xl text-red">
                Paid
              </span>
              <p className="mono mt-4 text-xs">No paid posts yet. The first one shows up here.</p>
            </div>
          )}
        </div>
      </section>

      {/* Live numbers */}
      <section aria-label="Live numbers" className="space-y-3">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(([label, val, bg], i) => (
            <div key={label} className={`bx rise p-5 ${bg}`} style={{ "--i": i } as React.CSSProperties}>
              <div className="display text-4xl tabular-nums sm:text-5xl">
                {!addresses.paidPost ? "-" : isLoading ? <span className="blink">_</span> : isError ? "!" : String(val)}
              </div>
              <div className="kicker mt-2">{label}</div>
            </div>
          ))}
        </div>
        <p className="mono text-xs">Counted live from PaidPost contract events. No database.</p>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <h2 className="h1">How it works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className={`bx rise p-6 ${s.bg}`} style={{ "--i": i } as React.CSSProperties}>
              <div className="display text-6xl">{s.n}</div>
              <h3 className="display mt-3 text-2xl">{s.h}</h3>
              <p className="mt-2">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Guarantees */}
      <section className="bx bg-ink p-8 text-paper">
        <h2 className="display text-3xl text-yellow sm:text-4xl">Nobody can run off with the money</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            "The sponsor cannot take the money back after the post is submitted.",
            "The creator is paid automatically if the sponsor goes silent.",
            "The sponsor gets everything back if the creator does not deliver.",
            "No owner, no admin key, no fee. The contract is the only rulebook.",
          ].map((x) => (
            <li key={x} className="flex gap-3">
              <span className="mt-1 h-4 w-4 shrink-0 bg-green" aria-hidden />
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Final call to action */}
      <section className="grid gap-6 md:grid-cols-2">
        <Link href="/sponsor/new" className="bx group block bg-yellow p-8 transition-transform hover:-translate-y-1">
          <div className="kicker">For brands, clubs, fests</div>
          <div className="display mt-2 text-3xl">Hire a creator &gt;</div>
          <p className="mt-2">From 0.5 QUSDC. Refunded if they do not deliver.</p>
        </Link>
        <Link href="/creator" className="bx group block bg-pink p-8 transition-transform hover:-translate-y-1">
          <div className="kicker">For creators</div>
          <div className="display mt-2 text-3xl">See my offers &gt;</div>
          <p className="mt-2">Get paid on delivery and build a public track record.</p>
        </Link>
      </section>
    </div>
  );
}
