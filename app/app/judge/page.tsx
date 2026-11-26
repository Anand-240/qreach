"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { erc20Abi, formatEther } from "viem";
import { useConnectors } from "wagmi";
import { paidPostAbi } from "@/lib/abi";
import { addresses, addrUrl, chain, DEPLOY_BLOCK, isMainnet, MAINNET } from "@/lib/config";
import { publicClient } from "@/lib/clients";
import { qieNeededFor, qiePrice } from "@/lib/oracle";
import { fmtDate, fmtQusdc } from "@/lib/format";
import { totals } from "@/lib/indexer";
import { useIndex } from "@/components/useIndex";

const REPO = process.env.NEXT_PUBLIC_REPO_URL;
const totalSupplyAbi = [
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const TEST_CMDS = [
  "cd contracts && forge test",
  "FORK=1 forge test --match-contract Fork --fork-url https://rpc1mainnet.qie.digital",
  "cd app && npx vitest run",
].join("\n");

export default function Judge() {
  const pp = addresses.paidPost;
  const idx = useIndex();
  const t = idx.data ? totals(idx.data) : null;
  const connectors = useConnectors();
  const probes = useQuery({
    queryKey: ["judgeProbes"],
    enabled: !!pp,
    queryFn: async () => {
      const [qusdc, router, qieId] = await Promise.all(
        (["qusdc", "router", "qieId"] as const).map((f) =>
          publicClient.readContract({ address: pp!, abi: paidPostAbi, functionName: f }),
        ),
      );
      const [symbol, names, price, quote] = await Promise.all([
        publicClient.readContract({ address: qusdc, abi: erc20Abi, functionName: "symbol" }).catch(() => "?"),
        publicClient
          .readContract({ address: qieId, abi: totalSupplyAbi, functionName: "totalSupply" })
          .catch(() => null),
        qiePrice(),
        qieNeededFor(1_000_000n),
      ]);
      return { qusdc, router, qieId, symbol, names, price, quote };
    },
  });
  const p = probes.data;
  const wallets = connectors.map((c) => c.name).filter((n) => n !== "Injected");

  const rows: [string, string, React.ReactNode][] = [
    [
      "QIE Wallet",
      "Connect and sign every transaction (EIP-1193, found via EIP-6963).",
      wallets.length ? `Wallets found in this browser: ${wallets.join(", ")}` : "No wallet found in this browser.",
    ],
    [
      "QUSDC",
      "Escrow currency. Locked on create, paid to the creator or refunded to the sponsor.",
      p ? (
        <a className="underline" href={addrUrl(p.qusdc)} target="_blank" rel="noreferrer">
          {p.symbol} at {p.qusdc.slice(0, 10)}...
        </a>
      ) : (
        "..."
      ),
    ],
    [
      "QIEDEX",
      "Pay with QIE: createCampaignWithQIE swaps QIE to exact QUSDC in one transaction and returns the rest.",
      p
        ? p.quote
          ? `Live quote: 1 QUSDC = ${Number(formatEther(p.quote)).toFixed(3)} QIE`
          : `Router ${p.router.slice(0, 10)}... (quotes on mainnet only)`
        : "...",
    ],
    [
      "QIE ID (.qie)",
      "Pick a creator by name. Creators link their name on chain; PaidPost checks ownership with domainOwnerByName.",
      p ? (p.names !== null ? `${p.names.toString()} names in the registry` : `Registry ${p.qieId.slice(0, 10)}...`) : "...",
    ],
    [
      "QIE Oracle",
      "QIE/USD price shown next to the pay-with-QIE quote.",
      p?.price ? `$${p.price.usd.toFixed(4)} as of ${fmtDate(p.price.updatedAt)}` : "...",
    ],
  ];

  const nums = [
    ["Campaigns", t?.campaigns],
    ["Paid posts", t?.paidCount],
    ["Creators paid", t?.paidCreators],
    ["Sponsors", t?.sponsors],
    ["QUSDC paid", t ? fmtQusdc(t.qusdcPaid) : undefined],
  ] as const;

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="kicker">For judges</p>
        <h1 className="h1">PaidPost in 60 seconds</h1>
        <p className="max-w-2xl text-lg">
          A creator escrow with a public disclosure record. Everything on this page is read live from {chain.name}.
        </p>
      </div>

      <section className="bx space-y-3 p-5 sm:p-6">
        <h2 className="display text-2xl">Contract</h2>
        {pp ? (
          <p className="break-all">
            <span className="kicker mr-2">PaidPost</span>
            {addrUrl(pp) ? (
              <a className="link mono font-bold" href={addrUrl(pp)} target="_blank" rel="noreferrer">{pp}</a>
            ) : (
              <span className="mono font-bold">{pp}</span>
            )}{" "}
            <span className="mono text-xs">(from block {DEPLOY_BLOCK.toString()})</span>
          </p>
        ) : (
          <p>Not configured.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {["No owner", "No admin key", "No fee", "No upgrade path"].map((x) => (
            <span key={x} className="tag bg-green">{x}</span>
          ))}
        </div>
        <p className="text-sm">
          Source: contracts/src/PaidPost.sol
          {REPO && (
            <>
              {" "}in <a className="link" href={REPO} target="_blank" rel="noreferrer">the repository</a>
            </>
          )}
          .
        </p>
        {!isMainnet && (
          <p className="border-[3px] border-ink bg-yellow p-2 text-sm font-bold">
            This build points at a test network. The submission build uses QIE mainnet (QUSDC {MAINNET.qusdc.slice(0, 8)}...).
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="display text-2xl">Live numbers</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {nums.map(([k, v], i) => (
            <div key={k} className={`bx rise p-4 ${i % 2 ? "bg-yellow" : "bg-white"}`} style={{ "--i": i } as React.CSSProperties}>
              <div className="display text-3xl">{v ?? <span className="blink">_</span>}</div>
              <div className="kicker mt-1">{k}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="display text-2xl">QIE components used</h2>
        <div className="space-y-4">
          {rows.map(([a, b, c], i) => (
            <div key={a} className="bx rise grid gap-3 p-4 md:grid-cols-[160px_1fr_280px] md:items-center" style={{ "--i": i } as React.CSSProperties}>
              <div className="display text-lg">{a}</div>
              <div className="text-sm">{b}</div>
              <div className="mono min-w-0 break-words border-[3px] border-ink bg-paper p-2 text-xs font-bold">{c}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="bx min-w-0 space-y-3 bg-lilac p-5">
          <h2 className="display text-2xl">Try it in 3 steps</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <Link className="link font-bold" href="/check">Check a post</Link>: paste a link from a paid campaign, or any other link to see the no-record case.
            </li>
            <li>Open a creator from a campaign page to see the Shill Score and its inputs.</li>
            <li>
              <Link className="link font-bold" href="/sponsor/new">Hire a creator</Link> with 0.5 QUSDC or the same value in QIE, and follow the campaign page.
            </li>
          </ol>
        </div>
        <div className="bx min-w-0 space-y-3 bg-ink p-5 text-paper">
          <h2 className="display text-2xl text-yellow">Run the tests</h2>
          <pre className="mono overflow-x-auto whitespace-pre text-xs leading-6">{TEST_CMDS}</pre>
        </div>
      </section>
    </div>
  );
}
