/**
 * Turn a post link into the one canonical string that QREACH stores and hashes.
 * The creator's submit and the public /check page both use this, so the same post
 * always gives the same hash, whatever share link someone pasted, and two different
 * posts never share a hash.
 *
 * Rules:
 * - https only; lowercase host; drop "www.", "mobile.", "m."; twitter.com -> x.com.
 * - X: x.com/<anyone>/status/<id> -> x.com/i/status/<id> (X ignores the username).
 * - Instagram: /p|reel|reels|tv/<code> -> /p|reel|tv/<code>, with or without a username prefix.
 * - YouTube: watch?v=<id>, youtu.be/<id>, shorts/<id>, live/<id> -> youtube.com/watch/<id>.
 * - Other sites: keep the query (it often IDs the post) but drop known tracking parameters, sorted.
 * - Drop the fragment and trailing slashes.
 * The result always passes the contract's own check: 10..300 bytes, printable ASCII, "https://".
 */
export type NormalizeResult = { ok: true; url: string } | { ok: false; error: string };

const HOST_ALIASES: Record<string, string> = { "twitter.com": "x.com", "youtu.be": "youtube.com" };

const TRACKING = /^(utm_.*|fbclid|gclid|igsh|igshid|si|s|t|ref|ref_src|ref_url|feature|share_id|mibextid|rcm|trk|lipi)$/i;

export function normalizeUrl(input: string): NormalizeResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Paste a post link." };
  let u: URL;
  try {
    u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: "That is not a valid link." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, error: "Use an https link." };
  if (u.username || u.password) return { ok: false, error: "Links with a login part are not allowed." };

  const rawHost = u.hostname.toLowerCase().replace(/^(www\.|mobile\.|m\.)/, "");
  let host = HOST_ALIASES[rawHost] ?? rawHost;
  let path = u.pathname.replace(/\/+$/, "");
  let query = "";

  if (host === "x.com") {
    const m = path.match(/^\/(?:[^/]+|i\/web)\/status(?:es)?\/(\d+)/i);
    if (m) path = `/i/status/${m[1]}`;
  } else if (host === "instagram.com") {
    const m = path.match(/^\/(?:[^/]+\/)?(p|reels?|tv)\/([^/]+)/);
    if (m) path = `/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}`;
  } else if (host === "youtube.com") {
    let id: string | null = null;
    if (rawHost === "youtu.be") id = path.slice(1).split("/")[0] || null;
    else if (path === "/watch") id = u.searchParams.get("v");
    else {
      const m = path.match(/^\/(?:shorts|live|embed|watch)\/([^/]+)/);
      if (m) id = m[1];
    }
    if (id) path = `/watch/${id}`;
    else if (path === "/watch") return { ok: false, error: "That YouTube link has no video id." };
  } else {
    const keep = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k));
    keep.sort(([a, x], [b, y]) => (a === b ? x.localeCompare(y) : a.localeCompare(b)));
    if (keep.length) query = `?${new URLSearchParams(keep).toString()}`;
  }
  if (u.port) host = `${host}:${u.port}`;

  const url = `https://${host}${path}${query}`;
  if (!host.includes(".")) return { ok: false, error: "That is not a valid link." };
  if (!/^[\x21-\x7e]+$/.test(url)) return { ok: false, error: "The link has characters that are not allowed." };
  if (url.length < 10) return { ok: false, error: "That link is too short." };
  if (url.length > 300) return { ok: false, error: "That link is too long (max 300 characters)." };
  return { ok: true, url };
}
