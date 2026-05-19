import { prisma } from './prisma';
import { lockSigForReview, InsufficientSigError } from './sig-ledger';
import { recruitAndReview } from './review-recruiter';

export const REVIEW_LOCK_AMOUNT = 50;

export class ReviewRequestError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'NOT_AUTHOR' | 'WRONG_STATUS' | 'INSUFFICIENT_SIG',
    message: string,
  ) {
    super(message);
    this.name = 'ReviewRequestError';
  }
}

export async function requestReview(paperId: string, requestingUserId: string) {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { id: true, slug: true, title: true, status: true, submittedById: true },
  });

  if (!paper) throw new ReviewRequestError('NOT_FOUND', 'Paper not found.');

  if (paper.submittedById !== requestingUserId) {
    throw new ReviewRequestError('NOT_AUTHOR', 'Only the submitting author can request review.');
  }

  if (paper.status !== 'DRAFT') {
    throw new ReviewRequestError(
      'WRONG_STATUS',
      `Paper is already in status ${paper.status}. Review can only be requested from DRAFT.`,
    );
  }

  try {
    await lockSigForReview(requestingUserId, paperId, REVIEW_LOCK_AMOUNT);
  } catch (err) {
    if (err instanceof InsufficientSigError) {
      throw new ReviewRequestError(
        'INSUFFICIENT_SIG',
        `You need ${REVIEW_LOCK_AMOUNT} $SIG to request review. ${err.message}`,
      );
    }
    throw err;
  }

  await prisma.paper.update({
    where: { id: paperId },
    data: {
      status: 'UNDER_REVIEW',
      creditsLocked: REVIEW_LOCK_AMOUNT,
    },
  });

  const recruitmentResult = await recruitAndReview(paperId);

  return { paper, recruitmentResult };
}
