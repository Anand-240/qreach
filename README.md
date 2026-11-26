# PaidPost

Hire creators with escrow, and let anyone check if a post was paid. Built on QIE mainnet for QIE Hackathon 3.0 (Consumer Apps & Social).

Status: in development.

## Contracts

```sh
cd contracts
forge build
forge test -vv                      # unit, fuzz and invariant tests
FORK=1 forge test --match-contract Fork --fork-url https://rpc1mainnet.qie.digital -vv
```

## App

Next.js 15 + wagmi/viem. No backend: every number comes from contract reads and event logs.

```sh
cd app
cp .env.example .env.local   # fill in the PaidPost address and deploy block
npm install
npm run dev
npx vitest run               # URL normaliser, Shill Score, campaign state rules
```

Pages: `/` (pitch, live counters), `/check` (is this post paid?), `/sponsor/new`, `/sponsor`, `/creator`,
`/c/[id]` (campaign timeline and actions), `/k/[name]` (creator profile and Shill Score), `/judge`.

### End-to-end test on a local chain

Runs the real UI in headless Chromium with a test wallet that forwards to anvil:
sponsor creates (QUSDC), creator accepts and submits, sponsor pays, `/check` finds the post,
creator links a .qie name, profile shows the score, sponsor creates a second campaign paid in QIE.

```sh
anvil &                                   # terminal 1
bash app/e2e/reset.sh                     # deploys PaidPost + mocks, registers riya.qie
# app/.env.local: CHAIN_ID=31337 and the addresses reset.sh prints (see e2e/flow.mjs header)
cd app && npm run dev -- -p 3210          # terminal 2
npm i -D playwright && npx playwright install chromium && RUN=1 node e2e/flow.mjs
```

## Deploy

```sh
cast wallet import deployer --interactive          # once; your key never leaves the keystore
cd contracts
forge script script/Deploy.s.sol --rpc-url qie_testnet --broadcast --account deployer   # mocks
forge script script/Deploy.s.sol --rpc-url qie_mainnet --broadcast --account deployer   # real QUSDC, QIEDEX, QIE ID
```

## QIE components

| Component | Where | How |
|---|---|---|
| QIE Wallet | app | connect and sign (EIP-1193, discovered via EIP-6963) |
| QUSDC | contract | escrow currency |
| QIEDEX | contract | `createCampaignWithQIE` swaps QIE to exact QUSDC (`swapETHForExactTokens`), returns the rest |
| QIE ID (.qie) | contract + app | `setQieName` checks `domainOwnerByName(label, "qie")`; app resolves names to addresses |
| QIE Oracle | app | QIE/USD price next to the pay-with-QIE quote |

All five were checked against QIE mainnet with fork tests (`test/PaidPost.fork.t.sol`) on 2026-11-26.

## Known limits

- The contract cannot see the post. It stores the link the creator submits; the sponsor checks it.
- If the sponsor does nothing during the review window, the creator can be paid automatically.
- There is no dispute process.
- A .qie name has no reverse record in QIE ID, so creators link their name once with `setQieName`.
  The app re-checks ownership every time it shows a name.

## Credits

- OpenZeppelin Contracts v5.1.0 (MIT)
- forge-std v1.9.4 (MIT/Apache-2.0)

## Licence

MIT
