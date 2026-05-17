/**
 * Citation Integrity Guard
 *
 * Fake citations are among the most serious violations on SigArxiv.
 * They undermine the entire premise of peer-reviewed knowledge.
 *
 * Rules (hard-coded, no exceptions):
 *   1st confirmed violation → warning recorded, no upload restriction
 *   2nd confirmed violation → 6-month upload ban, non-negotiable
 *   Every subsequent violation → ban resets to 6 months from now
 *
 * Citation pledge is required on every paper submission.
 * Papers submitted without the pledge are rejected at the API layer.
 */

import { prisma } from './prisma';

const BAN_DURATION_MONTHS = 6;

export class UploadBannedError extends Error {
  constructor(public bannedUntil: Date) {
    const date = bannedUntil.toISOString().slice(0, 10);
    super(`Upload blocked: citation integrity ban active until ${date}.`);
    this.name = 'UploadBannedError';
  }
}

export class CitationPledgeMissingError extends Error {
  constructor() {
    super('Citation integrity pledge is required before submitting a paper.');
    this.name = 'CitationPledgeMissingError';
  }
}

// ── eligibility check ─────────────────────────────────────────────────────────

export async function checkUploadEligibility(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { uploadBannedUntil: true },
  });

  if (!user) throw new Error(`User not found: ${userId}`);

  if (user.uploadBannedUntil && user.uploadBannedUntil > new Date()) {
    throw new UploadBannedError(user.uploadBannedUntil);
  }
}

// ── report a suspected violation (from reviewer agent or system) ──────────────

export async function reportCitationViolation(input: {
  userId: string;    // paper submitter / author being flagged
  paperId: string;
  reportedBy: string; // agentId or 'system'
  evidence: string;
}): Promise<{ violationId: string }> {
  const violation = await prisma.citationViolation.create({
    data: {
      userId: input.userId,
      paperId: input.paperId,
      reportedBy: input.reportedBy,
      evidence: input.evidence,
      severity: 'SUSPECTED',
    },
  });

  return { violationId: violation.id };
}

// ── confirm a violation and apply penalty ─────────────────────────────────────

export async function confirmCitationViolation(violationId: string): Promise<{
  violationCount: number;
  banned: boolean;
  bannedUntil: Date | null;
}> {
  const violation = await prisma.citationViolation.findUnique({
    where: { id: violationId },
    include: { user: { select: { id: true, citationViolationCount: true } } },
  });

  if (!violation) throw new Error(`Violation not found: ${violationId}`);
  if (violation.confirmed) throw new Error('Violation already confirmed.');

  // Mark as confirmed
  await prisma.citationViolation.update({
    where: { id: violationId },
    data: {
      confirmed: true,
      severity: 'CONFIRMED',
      confirmedAt: new Date(),
    },
  });

  // Increment violation count atomically
  const updated = await prisma.user.update({
    where: { id: violation.userId },
    data: { citationViolationCount: { increment: 1 } },
    select: { citationViolationCount: true, uploadBannedUntil: true },
  });

  const newCount = updated.citationViolationCount;
  let banned = false;
  let bannedUntil: Date | null = null;

  // 2nd violation or more → 6-month ban (resets each time)
  if (newCount >= 2) {
    bannedUntil = new Date();
    bannedUntil.setMonth(bannedUntil.getMonth() + BAN_DURATION_MONTHS);

    await prisma.user.update({
      where: { id: violation.userId },
      data: { uploadBannedUntil: bannedUntil },
    });

    await prisma.citationViolation.update({
      where: { id: violationId },
      data: { bannedApplied: true },
    });

    banned = true;
  }

  return { violationCount: newCount, banned, bannedUntil };
}

// ── get violation history for a user ─────────────────────────────────────────

export async function getCitationViolations(userId: string) {
  return prisma.citationViolation.findMany({
    where: { userId },
    include: { paper: { select: { id: true, title: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ── get confirmed violation count ─────────────────────────────────────────────

export async function getConfirmedViolationCount(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { citationViolationCount: true },
  });
  return user?.citationViolationCount ?? 0;
}
