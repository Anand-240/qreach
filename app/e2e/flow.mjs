// Shared helpers for the QREACH end-to-end suites. Run of every QREACH button against a local anvil chain.
// A small EIP-1193 test wallet is injected; it forwards calls to anvil, whose dev accounts are unlocked.
// Setup: anvil running, `bash reset.sh` done, app on :3210 with CHAIN_ID=31337 and the reset.sh addresses.
// Run:   RUN=1 node flow.mjs
import { chromium } from "playwright";
import fs from "node:fs";

const APP = process.env.APP ?? "http://localhost:3210";
const RPC = "http://127.0.0.1:8545";
const SPONSOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const CREATOR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const STRANGER = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const OUT = new URL(`./shots-${process.env.RUN ?? "x"}/`, import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

function walletScript(account) {
  return `(() => {
    const RPC = ${JSON.stringify(RPC)}, ACCT = ${JSON.stringify(account)};
    let id = 0, authorized = localStorage.getItem("tw-auth") === "1";
    const listeners = {};
    const provider = {
      isTestWallet: true,
      async request({ method, params }) {
        if (method === "eth_requestAccounts") { authorized = true; localStorage.setItem("tw-auth", "1"); return [ACCT]; }
        if (method === "eth_accounts") return authorized ? [ACCT] : [];
        if (method === "eth_chainId" && localStorage.getItem("tw-wrong-chain") === "1") return "0x1";
        if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") {
          localStorage.removeItem("tw-wrong-chain");
          (listeners.chainChanged ?? []).forEach((f) => f("0x7a69"));
          return null;
        }
        if (method === "eth_sendTransaction" && localStorage.getItem("tw-reject") === "1") {
          localStorage.removeItem("tw-reject");
          const e = new Error("User rejected the request."); e.code = 4001; throw e;
        }
        if (method === "wallet_requestPermissions") return [{ parentCapability: "eth_accounts" }];
        if (method === "wallet_revokePermissions") { authorized = false; localStorage.removeItem("tw-auth"); return null; }
        const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params: params ?? [] }) });
        const j = await r.json();
        if (j.error) { const e = new Error(j.error.message); e.code = j.error.code; e.data = j.error.data; throw e; }
        return j.result;
      },
      on(ev, fn) { (listeners[ev] ??= []).push(fn); },
      removeListener(ev, fn) { listeners[ev] = (listeners[ev] ?? []).filter((f) => f !== fn); },
    };
    window.ethereum = provider;
    window.__twEmit = (ev, v) => (listeners[ev] ?? []).forEach((f) => f(v));
    const info = { uuid: "00000000-0000-4000-8000-000000000001", name: "Test Wallet", icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>", rdns: "dev.test.wallet" };
    const announce = () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }));
    window.addEventListener("eip6963:requestProvider", announce);
    announce();
  })();`;
}

async function rpc(method, params = []) {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return (await r.json()).result;
}
async function warp(seconds) {
  await rpc("evm_increaseTime", [seconds]);
  await rpc("evm_mine");
}

const browser = await chromium.launch();
const errors = [];
let shotN = 0;
async function ctx(account, viewport = { width: 1280, height: 900 }) {
  const c = await browser.newContext({ viewport });
  await c.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP });
  await c.addInitScript(walletScript(account));
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(`pageerror: ${e.message.split("\n")[0]}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().split("\n")[0]}`));
  return p;
}
async function connect(p) {
  const header = p.locator("header");
  await header.getByRole("button", { name: "Connect wallet" }).click();
  await header.getByRole("button", { name: "Test Wallet" }).click();
  await header.getByRole("button", { name: "Disconnect" }).waitFor();
}
const shot = (p, n) => p.screenshot({ path: `${OUT}${String(++shotN).padStart(2, "0")}-${n}.png`, fullPage: true });
const step = (s) => console.log(`-- ${s}`);
const done = (p, label) => p.getByRole("status").filter({ hasText: `${label}: done` }).waitFor({ timeout: 30000 });

async function createCampaign(s, { creator, amount, quick, review = "24", acceptDays = "2", pay = "QUSDC", brief }) {
  await s.goto(`${APP}/sponsor/new`);
  await s.getByLabel("1. Creator").fill(creator);
  if (quick) await s.getByRole("button", { name: `${quick} QUSDC`, exact: true }).click();
  else await s.getByLabel("2. Amount (QUSDC = US dollars)").fill(amount);
  if (pay === "QIE") {
    await s.getByRole("button", { name: "QIE", exact: true }).click();
    await s.getByText(/You send up to/).waitFor();
  }
  await s.getByLabel("4. Accept within").selectOption(acceptDays);
  await s.getByLabel("Your review time").selectOption(review);
  await s.getByLabel("5. Brief").fill(brief);
  const lock = s.getByRole("button", { name: /^Lock .* QUSDC$/ });
  await lock.waitFor();
  await s.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /^Lock .* QUSDC$/.test(x.textContent ?? ""));
    return b && !b.disabled;
  }, null, { timeout: 30000 });
  await lock.click();
  await s.waitForURL(/\/c\/\d+$/, { timeout: 60000 });
  return Number(s.url().split("/").pop());
}

try {
  // ---------------- Sponsor: mint, create #1 with the quick amount button ----------------
  const s = await ctx(SPONSOR);
  await s.goto(`${APP}/sponsor/new`);
  await s.locator("aside").getByText("Connect a wallet to send the offer.").waitFor();
  await connect(s);
  await s.getByRole("button", { name: "Mint 100 test QUSDC" }).click();
  await done(s, "Mint 100 test QUSDC");
  await s.getByText("Your balance: 100.00 QUSDC").waitFor();
  await s.getByLabel("1. Creator").fill("nobody.qie");
  await s.getByText("nobody.qie is not registered.").waitFor();
  await s.getByLabel("1. Creator").fill("riya.qie");
  await s.getByText("riya.qie = 0x7099...79C8").waitFor();
  await shot(s, "sponsor-form");
  const id1 = await createCampaign(s, { creator: "riya.qie", quick: "2", review: "1", brief: "One post on X about TechFest 2026 with the registration link." });
  if (id1 !== 1) throw new Error(`expected campaign 1, got ${id1}`);
  await s.getByText("Offer sent").waitFor();
  await s.getByText("You are the sponsor").waitFor();
  await shot(s, "campaign-created");
  step("1 sponsor minted, name lookup works, campaign #1 created with quick amount");

  // ---------------- Creator: sees offer, accepts, submits messy link ----------------
  const c = await ctx(CREATOR);
  await c.goto(`${APP}/creator`);
  await connect(c);
  await c.getByText("Accept or decline").waitFor({ timeout: 30000 });
  await shot(c, "creator-offers");
  await c.getByRole("link", { name: /#1/ }).click();
  await c.waitForURL(/\/c\/1$/);
  await c.getByRole("button", { name: "Accept offer" }).click();
  await done(c, "Accept offer");
  await c.getByLabel("Link to your published post").fill("not a link");
  await c.getByText("That is not a valid link.").waitFor();
  await c.getByLabel("Link to your published post").fill("https://mobile.twitter.com/Riya/status/1234567890?s=20&t=abc");
  await c.getByText("Will be recorded as https://x.com/i/status/1234567890").waitFor();
  await c.getByRole("button", { name: "Submit post" }).click();
  await done(c, "Submit post");
  await c.getByText("Waiting for the sponsor to approve").waitFor();
  await shot(c, "submitted");
  step("2 creator accepted, URL validation works, post submitted");

  // ---------------- Sponsor approves ----------------
  await s.goto(`${APP}/sponsor`);
  await s.getByText("Review the post").waitFor({ timeout: 30000 });
  await s.getByRole("link", { name: /#1/ }).click();
  await s.getByRole("button", { name: /Approve and pay 2.00 QUSDC/ }).click();
  await done(s, "Approve and pay");
  await s.getByText("Paid and disclosed").first().waitFor();
  await shot(s, "paid");
  await s.getByRole("link", { name: "See the public record >" }).click();
  await s.getByText("Paid promotion").waitFor({ timeout: 30000 });
  step("3 sponsor approved and paid; link to public record works");

  // ---------------- Public check (mobile, signed out) ----------------
  const pub = await ctx(STRANGER, { width: 390, height: 844 });
  await pub.goto(`${APP}/`);
  await pub.getByText("Latest disclosure").waitFor({ timeout: 30000 });
  await shot(pub, "home-mobile");
  await pub.getByLabel("Post link").fill("x.com/riya/status/1234567890/photo/1");
  await pub.getByRole("button", { name: "Is this post paid?" }).click();
  await pub.waitForURL(/\/check\?u=/);
  await pub.getByText("Paid promotion").waitFor({ timeout: 30000 });
  await pub.getByRole("button", { name: "Copy result link" }).click();
  await pub.getByRole("button", { name: "Copied" }).waitFor();
  const clip = await pub.evaluate(() => navigator.clipboard.readText());
  if (!clip.includes("/check?u=")) throw new Error(`clipboard has ${clip}`);
  await shot(pub, "check-paid-mobile");
  await pub.getByLabel("Post link").fill("https://x.com/someone/status/999");
  await pub.getByRole("button", { name: "Is this post paid?" }).click();
  await pub.getByText("No QREACH record").waitFor({ timeout: 30000 });
  await shot(pub, "check-none-mobile");
  await pub.getByRole("button", { name: "Menu" }).click();
  await pub.locator("#mobile-menu").getByRole("link", { name: "Judges" }).click();
  await pub.waitForURL(/\/judge$/);
  await pub.getByText("QIE components used").waitFor();
  await shot(pub, "judge-mobile");
  step("4 home example card, check paid/none, copy link, mobile menu all work");

  // ---------------- Creator links, changes, removes and re-links .qie name ----------------
  await c.goto(`${APP}/creator`);
  const nameInput = c.getByLabel("Show your .qie name instead of 0x...");
  await nameInput.fill("nobody");
  await c.getByText("nobody.qie is not registered.").waitFor();
  await nameInput.fill("riya.qie");
  await c.getByText("riya.qie is yours.").waitFor();
  await c.getByRole("button", { name: "Link name" }).click();
  await c.getByText("Sponsors see you as").waitFor({ timeout: 30000 });
  await c.getByRole("button", { name: "Change" }).click();
  await c.getByRole("button", { name: "Cancel" }).click();
  await c.getByRole("button", { name: "Remove" }).click();
  await c.getByLabel("Show your .qie name instead of 0x...").waitFor({ timeout: 30000 });
  await c.getByLabel("Show your .qie name instead of 0x...").fill("riya");
  await c.getByText("riya.qie is yours.").waitFor();
  await c.getByRole("button", { name: "Link name" }).click();
  await c.getByText("Sponsors see you as").waitFor({ timeout: 30000 });
  await c.getByRole("link", { name: "My public profile >" }).click();
  await c.waitForURL(/\/k\//);
  await c.getByText("Shill Score / 100").waitFor({ timeout: 30000 });
  const score = await c.locator(".display.text-8xl").innerText();
  if (score.trim() !== "57") throw new Error(`score ${score}`); // 50*1 + 30*0.1 + 20*0.2
  await c.getByRole("button", { name: "Copy profile link" }).click();
  await c.getByRole("button", { name: "Copied" }).waitFor();
  await shot(c, "profile");
  await c.getByRole("link", { name: "Hire this creator" }).click();
  await c.waitForURL(/\/sponsor\/new\?to=/);
  await c.getByText("riya.qie = 0x7099...79C8").waitFor({ timeout: 30000 });
  step("5 name link / change / remove / relink, profile score 57, copy, hire-this-creator prefill");

  // ---------------- #2 paid in QIE, creator declines (two-tap) ----------------
  const id2 = await createCampaign(s, { creator: CREATOR, amount: "1.5", pay: "QIE", brief: "Story about the hackathon." });
  await c.goto(`${APP}/c/${id2}`);
  await c.getByRole("button", { name: "Decline" }).click();
  await c.getByText("Sure?").waitFor();
  await c.getByRole("button", { name: "No" }).click();
  await c.getByRole("button", { name: "Decline" }).click();
  await c.getByRole("button", { name: "Yes, decline" }).click();
  await done(c, "Decline offer");
  await c.getByText("The creator declined.").waitFor();
  step(`6 campaign #${id2} paid with QIE, creator declined with confirm`);

  // ---------------- #3 sponsor cancels ----------------
  const id3 = await createCampaign(s, { creator: "riya.qie", amount: "0.5", brief: "Cancel test." });
  await s.getByRole("button", { name: "Cancel offer" }).click();
  await s.getByRole("button", { name: "Yes, cancel offer" }).click();
  await done(s, "Cancel offer");
  await s.getByText("The sponsor got the full amount back.").waitFor();
  step(`7 campaign #${id3} cancelled by sponsor with confirm`);

  // ---------------- #4 expires unaccepted; #5 auto-released ----------------
  const id4 = await createCampaign(s, { creator: "riya.qie", amount: "1", acceptDays: "1", brief: "Expiry test." });
  const id5 = await createCampaign(s, { creator: "riya.qie", amount: "1", review: "1", brief: "Auto release test." });
  await c.goto(`${APP}/c/${id5}`);
  await c.getByRole("button", { name: "Accept offer" }).click();
  await done(c, "Accept offer");
  await c.getByLabel("Link to your published post").fill("https://www.instagram.com/reel/Cx1Ab2/?igsh=xyz");
  await c.getByRole("button", { name: "Submit post" }).click();
  await done(c, "Submit post");
  await warp(2 * 86400);
  const x = await ctx(STRANGER);
  await x.goto(`${APP}/c/${id4}`);
  await connect(x);
  await x.getByText("Expired").waitFor({ timeout: 30000 });
  await x.getByRole("button", { name: "Refund sponsor" }).click();
  await done(x, "Refund sponsor");
  await x.getByText("Refunded", { exact: true }).first().waitFor();
  await x.goto(`${APP}/c/${id5}`);
  await x.getByText("Over: payment can be released").waitFor({ timeout: 30000 });
  await shot(x, "auto-release-ready");
  await x.getByRole("button", { name: "Release payment to creator" }).click();
  await done(x, "Release payment");
  await x.getByText("Paid (released after review time)").waitFor({ timeout: 30000 });
  step(`8 stranger refunded expired #${id4} and auto-released #${id5} after time warp`);

  // ---------------- Sponsor dashboard filters ----------------
  await s.goto(`${APP}/sponsor`);
  await s.getByRole("tab", { name: "All (5)" }).waitFor({ timeout: 30000 });
  await s.getByRole("tab", { name: "Paid (2)" }).click();
  await s.getByRole("tab", { name: "Refunded (3)" }).click();
  await s.getByRole("tab", { name: "Open (0)" }).click();
  await s.getByText("Nothing in this filter.").waitFor();
  await s.getByRole("tab", { name: "All (5)" }).click();
  await shot(s, "sponsor-list");
  step("9 sponsor filters: all 5, paid 2, refunded 3, open 0");

  // ---------------- Not found states, home, judge, disconnect ----------------
  await s.goto(`${APP}/c/999`);
  await s.getByText("This campaign does not exist.").waitFor({ timeout: 30000 });
  await s.goto(`${APP}/k/nobody.qie`);
  await s.getByText("This is not a registered .qie name or a wallet address.").waitFor({ timeout: 30000 });
  await s.goto(`${APP}/no-such-page`);
  await s.getByText("This page does not exist.").waitFor();
  await s.goto(`${APP}/`);
  await s.getByText("Latest disclosure").waitFor({ timeout: 30000 });
  await s.waitForTimeout(1200);
  await shot(s, "home");
  await s.goto(`${APP}/judge`);
  await s.getByText(/\$0\.\d+ as of/).waitFor({ timeout: 30000 });
  await shot(s, "judge");
  await s.locator("header").getByRole("button", { name: "Disconnect" }).click();
  await s.locator("header").getByRole("button", { name: "Connect wallet" }).waitFor();
  step("10 not-found states, home, judge with live oracle, disconnect");
  console.log("RESULT: PASS");
} catch (e) {
  console.log("RESULT: FAIL", e.message.split("\n").slice(0, 6).join(" | "));
  for (const pg of browser.contexts().flatMap((x) => x.pages())) await shot(pg, "fail").catch(() => {});
} finally {
  console.log("errors:", JSON.stringify([...new Set(errors)].slice(0, 15), null, 1));
  await browser.close();
}
