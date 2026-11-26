/**
 * Turn a post link into the one canonical string that PaidPost stores and hashes.
 * The creator's submit and the public /check page both use this, so the same post
 * always gives the same hash, whatever share link someone pasted.
 *
 * Rules: https only; lowercase host; drop "www." and "mobile." and "m.";
 * twitter.com -> x.com; drop query string and fragment; drop trailing slash.
 * The result must pass the contract's own check: 10..300 bytes, printable ASCII, "https://".
 */
export type NormalizeResult = { ok: true; url: string } | { ok: false; error: string };

const HOST_ALIASES: Record<string, string> = {
  "twitter.com": "x.com",
  "youtu.be": "youtube.com",
};

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

  let host = u.hostname.toLowerCase().replace(/^(www\.|mobile\.|m\.)/, "");
  let path = u.pathname;
  if (host === "youtu.be") {
    // youtu.be/<id> -> youtube.com/watch/<id>  (keep it query-free)
    path = `/watch${path}`;
  }
  if (host === "youtube.com" && path === "/watch") {
    const v = u.searchParams.get("v");
    if (v) path = `/watch/${v}`;
  }
  host = HOST_ALIASES[host] ?? host;
  if (host === "x.com") {
    // x.com/<user>/status/<id>/photo/1 -> x.com/<user>/status/<id>; usernames are case-insensitive
    const m = path.match(/^\/([^/]+)\/status(?:es)?\/(\d+)/i);
    if (m) path = `/${m[1].toLowerCase()}/status/${m[2]}`;
  }
  if (host === "instagram.com") {
    const m = path.match(/^\/(?:[^/]+\/)?(p|reel|tv)\/([^/]+)/);
    if (m) path = `/${m[1]}/${m[2]}`;
  }
  path = path.replace(/\/+$/, "");
  if (u.port) host = `${host}:${u.port}`;

  const url = `https://${host}${path}`;
  if (!/^[\x21-\x7e]+$/.test(url)) return { ok: false, error: "The link has characters that are not allowed." };
  if (url.length < 10) return { ok: false, error: "That link is too short." };
  if (url.length > 300) return { ok: false, error: "That link is too long (max 300 characters)." };
  if (!host.includes(".")) return { ok: false, error: "That is not a valid link." };
  return { ok: true, url };
}
