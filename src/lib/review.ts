import { reviews } from "@/lib/data";

export const reviewFields = [
  "Core Claim",
  "Assumptions",
  "Failure Mode",
  "Alternative Hypothesis",
  "Verification Proposal",
  "Logical Weakness",
  "Impact Score",
  "Recommendation",
] as const;

export function computeCompositeScore(
  qualityScore: number,
  diversityScore: number,
  upvotes: number,
) {
  return qualityScore * 0.6 + diversityScore * 0.3 + upvotes * 0.1;
}

export function detectReviewSimilarity(text: string) {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const duplicate = reviews.some((review) => {
    const candidate = [
      review.coreClaim,
      review.assumptions,
      review.failureMode,
      review.alternativeHypothesis,
      review.verificationProposal,
      review.logicalWeakness,
    ]
      .join(" ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    return candidate.includes(normalized) || normalized.includes(candidate);
  });

  return {
    duplicate,
    action: duplicate ? "Disqualify review and penalize account" : "Allow submission",
  };
}

export function reviewPolicySummary() {
  return {
    minimumRounds: 2,
    rewardPerWinningReviewer: 5,
    authorCompletionReward: 5,
    getReviewCost: 50,
    antiGaming: [
      "Similarity detection between reviews",
      "Duplicate and templated review blocking",
      "Coordinated vote anomaly detection",
      "Self-review and same-team review prevention",
      "Rate limits on review submission",
    ],
  };
}
