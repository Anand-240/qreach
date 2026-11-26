import { defineChain, type Address } from "viem";

export const qieMainnet = defineChain({
  id: 1990,
  name: "QIE Mainnet",
  nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc1mainnet.qie.digital"] } },
  blockExplorers: { default: { name: "QIE Explorer", url: "https://mainnet.qie.digital" } },
});

export const qieTestnet = defineChain({
  id: 1983,
  name: "QIE Testnet",
  nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc1testnet.qie.digital"] } },
  blockExplorers: { default: { name: "QIE Testnet Explorer", url: "https://testnet.qie.digital" } },
  testnet: true,
});

export const localChain = defineChain({
  id: 31337,
  name: "Local (anvil)",
  nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  testnet: true,
});

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "1990");
export const chain = CHAIN_ID === 1983 ? qieTestnet : CHAIN_ID === 31337 ? localChain : qieMainnet;
export const isMainnet = chain.id === 1990;

/** Mainnet addresses of QIE components (checked on chain 2026-11-26). */
export const MAINNET = {
  qusdc: "0x3F43DA82eC9A4f5285F10FaF1F26EcA7319E5DA5",
  router: "0x08cd2e72e156D8563B4351eb4065C262A9f553Ef",
  qieId: "0x9aab56e7727af53A3131985BFB16d845319b7bdc",
  qieUsd: "0x3Bc617cF3A4Bb77003e4c556B87b13D556903D17",
} as const satisfies Record<string, Address>;

const env = (v: string | undefined) => (v && v.startsWith("0x") ? (v as Address) : undefined);

export const addresses = {
  paidPost: env(process.env.NEXT_PUBLIC_PAIDPOST),
  qusdc: env(process.env.NEXT_PUBLIC_QUSDC) ?? (isMainnet ? MAINNET.qusdc : undefined),
  qieId: env(process.env.NEXT_PUBLIC_QIEID) ?? (isMainnet ? MAINNET.qieId : undefined),
  // The oracle exists only on mainnet. The app reads it from mainnet on every chain.
  qieUsd: MAINNET.qieUsd,
};

export const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK ?? "0");
export const LOG_SPAN = 9_999n; // QIE RPC refuses ranges over 10,000 blocks

export const QUSDC_DECIMALS = 6;

export function txUrl(hash: string) {
  const base = chain.blockExplorers?.default.url;
  return base ? `${base}/tx/${hash}` : undefined;
}
export function addrUrl(a: string) {
  const base = chain.blockExplorers?.default.url;
  return base ? `${base}/address/${a}` : undefined;
}
