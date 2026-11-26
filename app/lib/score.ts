/** Shill Score: every input comes from PaidPost on-chain data. See docs/SPEC.md. */
export type ScoreInputs = { completed: number; onTime: number; expired: number; uniqueSponsors: number };
export type Score =
  | { kind: "new" }
  | {
      kind: "scored";
      score: number;
      completionRate: number;
      onTimeRate: number;
      experience: number;
      sponsorVariety: number;
    };

export function shillScore(i: ScoreInputs): Score {
  if (i.completed + i.expired === 0) return { kind: "new" };
  const completionRate = i.completed / (i.completed + i.expired);
  const onTimeRate = i.completed === 0 ? 0 : i.onTime / i.completed;
  const experience = Math.min(1, i.completed / 10);
  const sponsorVariety = Math.min(1, i.uniqueSponsors / 5);
  const score = Math.round(40 * completionRate + 30 * onTimeRate + 20 * experience + 10 * sponsorVariety);
  return { kind: "scored", score, completionRate, onTimeRate, experience, sponsorVariety };
}
