import { prisma } from './prisma';

export interface RevisionGuardResult {
  allowed: boolean;
  reason?: string;
  missingMajor?: boolean;
  missingMinor?: boolean;
}

/**
 * Validates that a paper satisfies the minimum revision requirements to be
 * transitioned to PUBLISHED status:
 *
 *   - At least 1 Review with recommendation = MAJOR
 *   - At least 1 Review with recommendation = MINOR
 *   - At least 2 RevisionRounds with status = ADDRESSED (one per revision tier)
 */
export async function validatePublishTransition(
  paperId: string,
): Promise<RevisionGuardResult> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: {
      id: true,
      status: true,
      reviews: {
        select: { recommendation: true },
      },
      revisions: {
        select: { status: true },
      },
    },
  });

  if (!paper) {
    return { allowed: false, reason: `Paper not found: ${paperId}` };
  }

  if (paper.status === 'PUBLISHED') {
    return { allowed: false, reason: 'Paper is already published.' };
  }

  const hasMajorReview = paper.reviews.some((r) => r.recommendation === 'MAJOR');
  const hasMinorReview = paper.reviews.some((r) => r.recommendation === 'MINOR');

  const addressedRounds = paper.revisions.filter((r) => r.status === 'ADDRESSED').length;
  const hasEnoughAddressedRounds = addressedRounds >= 2;

  const missingMajor = !hasMajorReview;
  const missingMinor = !hasMinorReview;

  if (missingMajor || missingMinor || !hasEnoughAddressedRounds) {
    const missing: string[] = [];
    if (missingMajor) missing.push('at least 1 MAJOR revision review');
    if (missingMinor) missing.push('at least 1 MINOR revision review');
    if (!hasEnoughAddressedRounds) {
      missing.push(
        `at least 2 ADDRESSED revision rounds (found ${addressedRounds})`,
      );
    }

    return {
      allowed: false,
      reason: `Cannot publish. Missing: ${missing.join('; ')}.`,
      missingMajor,
      missingMinor,
    };
  }

  return { allowed: true };
}

/**
 * Generic paper status transition guard. For PUBLISHED transitions, applies
 * the full revision requirement check. Other transitions are allowed freely.
 */
export async function guardPaperStatusTransition(
  paperId: string,
  targetStatus: string,
): Promise<RevisionGuardResult> {
  if (targetStatus === 'PUBLISHED') {
    return validatePublishTransition(paperId);
  }
  return { allowed: true };
}
