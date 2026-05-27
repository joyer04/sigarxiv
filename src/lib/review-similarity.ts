import { prisma } from './prisma';

// Jaccard similarity on content word tokens.
// No external API needed — deterministic and fast.

const DISQUALIFY_THRESHOLD = 0.72; // above this = suspiciously copied
const MIN_TOKEN_LENGTH = 4;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((s) => s.length >= MIN_TOKEN_LENGTH),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

function reviewText(r: {
  coreClaim: string;
  assumptions: string;
  failureMode: string;
  alternativeHypothesis: string;
  verificationProposal: string;
  logicalWeakness: string;
}): string {
  return [
    r.coreClaim,
    r.assumptions,
    r.failureMode,
    r.alternativeHypothesis,
    r.verificationProposal,
    r.logicalWeakness,
  ].join(' ');
}

export interface SimilarityUpdate {
  reviewId: string;
  similarityScore: number;
  disqualified: boolean;
  mostSimilarReviewId: string | null;
}

/**
 * Compute pairwise Jaccard similarity across all non-disqualified reviews
 * for a paper, then update similarityScore (and disqualify if over threshold).
 *
 * Called after each new review is submitted so scores stay current.
 */
export async function recomputeSimilarityForPaper(paperId: string): Promise<SimilarityUpdate[]> {
  const reviews = await prisma.review.findMany({
    where: { paperId, disqualified: false },
    select: {
      id: true,
      coreClaim: true,
      assumptions: true,
      failureMode: true,
      alternativeHypothesis: true,
      verificationProposal: true,
      logicalWeakness: true,
    },
  });

  if (reviews.length < 2) return [];

  const tokenized = reviews.map((r) => ({
    id: r.id,
    tokens: tokenize(reviewText(r)),
  }));

  const updates: SimilarityUpdate[] = [];

  for (let i = 0; i < tokenized.length; i++) {
    let maxSim = 0;
    let mostSimilarId: string | null = null;

    for (let j = 0; j < tokenized.length; j++) {
      if (i === j) continue;
      const sim = jaccard(tokenized[i].tokens, tokenized[j].tokens);
      if (sim > maxSim) {
        maxSim = sim;
        mostSimilarId = tokenized[j].id;
      }
    }

    updates.push({
      reviewId: tokenized[i].id,
      similarityScore: maxSim,
      disqualified: maxSim >= DISQUALIFY_THRESHOLD,
      mostSimilarReviewId: mostSimilarId,
    });
  }

  await Promise.all(
    updates.map((u) =>
      prisma.review.update({
        where: { id: u.reviewId },
        data: {
          similarityScore: u.similarityScore,
          ...(u.disqualified
            ? {
                disqualified: true,
                disqualificationReason: `Similarity ${(u.similarityScore * 100).toFixed(0)}% against review ${u.mostSimilarReviewId} exceeds anti-gaming threshold (${Math.round(DISQUALIFY_THRESHOLD * 100)}%).`,
              }
            : {}),
        },
      }),
    ),
  );

  return updates;
}
