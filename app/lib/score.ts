/** Shill Score: every input comes from QREACH on-chain data. */
export type ScoreInputs = { completed: number; expired: number; uniqueSponsors: number };
export type Score =
  | { kind: "new" }
  | { kind: "scored"; score: number; completionRate: number; experience: number; sponsorVariety: number };

export const WEIGHTS = { completion: 50, experience: 30, variety: 20 } as const;

export function shillScore(i: ScoreInputs): Score {
  if (i.completed + i.expired === 0) return { kind: "new" };
  const completionRate = i.completed / (i.completed + i.expired);
  const experience = Math.min(1, i.completed / 10);
  const sponsorVariety = Math.min(1, i.uniqueSponsors / 5);
  const score = Math.round(
    WEIGHTS.completion * completionRate + WEIGHTS.experience * experience + WEIGHTS.variety * sponsorVariety,
  );
  return { kind: "scored", score, completionRate, experience, sponsorVariety };
}
