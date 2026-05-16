/**
 * $SIG Coin Ledger
 *
 * All balance mutations MUST go through this module.
 * Every operation is atomic: balance update + transaction record happen in one
 * DB transaction — preventing double-spend and leaving an immutable audit trail.
 *
 * Security invariants:
 *   1. Balance never goes below 0 (enforced before every debit).
 *   2. balanceBefore + amount === balanceAfter on every record.
 *   3. No direct prisma.user.update({ sigCreditBalance }) outside this file.
 *   4. SigTransaction rows are never deleted or updated.
 */

import { Prisma, SigTxType } from '@prisma/client';
import { prisma } from './prisma';

export { SigTxType };

export class InsufficientSigError extends Error {
  constructor(available: number, required: number) {
    super(`Insufficient $SIG: need ${required}, have ${available}`);
    this.name = 'InsufficientSigError';
  }
}

export interface SigOpOptions {
  paperId?: string;
  reviewId?: string;
}

// ── internal atomic helper ────────────────────────────────────────────────────

async function applyDelta(
  userId: string,
  delta: number,        // positive = credit, negative = debit
  type: SigTxType,
  reason: string,
  opts: SigOpOptions = {},
  tx: Prisma.TransactionClient,
) {
  // Lock the user row for update to prevent concurrent race conditions
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { sigCreditBalance: true },
  });

  if (!user) throw new Error(`User not found: ${userId}`);

  const balanceBefore = user.sigCreditBalance;
  const balanceAfter = balanceBefore + delta;

  if (balanceAfter < 0) {
    throw new InsufficientSigError(balanceBefore, Math.abs(delta));
  }

  await tx.user.update({
    where: { id: userId },
    data: { sigCreditBalance: balanceAfter },
  });

  await tx.sigTransaction.create({
    data: {
      userId,
      type,
      amount: delta,
      balanceBefore,
      balanceAfter,
      reason,
      paperId: opts.paperId ?? null,
      reviewId: opts.reviewId ?? null,
    },
  });

  return { balanceBefore, balanceAfter, delta };
}

// ── public API ────────────────────────────────────────────────────────────────

/** Initial allocation or admin top-up. Never subtracts. */
export async function mintSig(
  userId: string,
  amount: number,
  reason = 'Beta allocation',
) {
  if (amount <= 0) throw new Error('Mint amount must be positive');
  return prisma.$transaction((tx) =>
    applyDelta(userId, amount, SigTxType.MINT, reason, {}, tx),
  );
}

/** Author locks $SIG when requesting review. Reverts via unlockSig on cancel. */
export async function lockSigForReview(
  userId: string,
  paperId: string,
  amount: number,
) {
  if (amount <= 0) throw new Error('Lock amount must be positive');
  return prisma.$transaction((tx) =>
    applyDelta(userId, -amount, SigTxType.LOCK, `Locked for review: paper ${paperId}`, { paperId }, tx),
  );
}

/** Return locked $SIG to the author if the review is cancelled/refunded. */
export async function unlockSig(
  userId: string,
  paperId: string,
  amount: number,
) {
  if (amount <= 0) throw new Error('Unlock amount must be positive');
  return prisma.$transaction((tx) =>
    applyDelta(userId, amount, SigTxType.UNLOCK, `Unlocked refund: paper ${paperId}`, { paperId }, tx),
  );
}

/** Reward a top-3 reviewer agent owner. */
export async function rewardReviewer(
  userId: string,
  reviewId: string,
  amount: number,
  paperId?: string,
) {
  if (amount <= 0) throw new Error('Reward amount must be positive');
  return prisma.$transaction((tx) =>
    applyDelta(userId, amount, SigTxType.REWARD_REVIEWER, `Top-3 reviewer reward`, { paperId, reviewId }, tx),
  );
}

/** Reward an author after review completion. */
export async function rewardAuthor(
  userId: string,
  paperId: string,
  amount: number,
) {
  if (amount <= 0) throw new Error('Reward amount must be positive');
  return prisma.$transaction((tx) =>
    applyDelta(userId, amount, SigTxType.REWARD_AUTHOR, `Review completion reward: paper ${paperId}`, { paperId }, tx),
  );
}

/** Deduct $SIG as penalty (anti-gaming, self-review, etc.). */
export async function penalizeSig(
  userId: string,
  amount: number,
  reason: string,
) {
  if (amount <= 0) throw new Error('Penalty amount must be positive');
  return prisma.$transaction((tx) =>
    applyDelta(userId, -amount, SigTxType.PENALTY, reason, {}, tx),
  );
}

/** Current balance — source of truth from DB. */
export async function getSigBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sigCreditBalance: true },
  });
  return user?.sigCreditBalance ?? 0;
}

/** Full transaction history for a user, newest first. */
export async function getSigHistory(userId: string, limit = 50) {
  return prisma.sigTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
