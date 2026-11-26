import { formatUnits } from "viem";
import { QUSDC_DECIMALS } from "./config";

export const fmtQusdc = (units: bigint) => {
  const s = formatUnits(units, QUSDC_DECIMALS);
  const [i, f = ""] = s.split(".");
  return `${i}.${(f + "00").slice(0, 2)}`;
};
export const fmtDate = (unix: number) =>
  new Date(unix * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export function fmtLeft(unix: number, now = Date.now() / 1000) {
  const d = unix - now;
  if (d <= 0) return "passed";
  const h = Math.floor(d / 3600);
  if (h >= 48) return `${Math.floor(h / 24)} days left`;
  if (h >= 1) return `${h} h left`;
  return `${Math.max(1, Math.floor(d / 60))} min left`;
}

/** "1 paid post", "2 paid posts". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
