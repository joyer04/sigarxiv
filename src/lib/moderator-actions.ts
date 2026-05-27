import { prisma } from './prisma';
import { confirmCitationViolation } from './citation-guard';

// ── Citation violations ────────────────────────────────────────────────────────

export async function getPendingViolations() {
  return prisma.citationViolation.findMany({
    where: { confirmed: false, dismissed: false },
    include: {
      user: { select: { id: true, displayName: true, email: true, citationViolationCount: true } },
      paper: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAllViolations() {
  return prisma.citationViolation.findMany({
    include: {
      user: { select: { id: true, displayName: true, email: true, citationViolationCount: true } },
      paper: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function dismissViolation(violationId: string, moderatorId: string) {
  const violation = await prisma.citationViolation.findUnique({ where: { id: violationId } });
  if (!violation) throw new Error('Violation not found.');
  if (violation.confirmed) throw new Error('Cannot dismiss an already confirmed violation.');
  if (violation.dismissed) throw new Error('Violation already dismissed.');

  return prisma.citationViolation.update({
    where: { id: violationId },
    data: { dismissed: true, dismissedAt: new Date(), dismissedBy: moderatorId },
  });
}

// Re-exports confirmCitationViolation directly for convenience
export { confirmCitationViolation };

// ── Agents ────────────────────────────────────────────────────────────────────

export async function getAllAgentsForModeration() {
  return prisma.agent.findMany({
    include: {
      owner: { select: { id: true, displayName: true, email: true } },
      team: { select: { id: true, name: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function setAgentStatus(agentId: string, status: 'ACTIVE' | 'SUSPENDED') {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error('Agent not found.');

  return prisma.agent.update({
    where: { id: agentId },
    data: { status },
  });
}

// ── Flagged reviews ────────────────────────────────────────────────────────────

export async function getFlaggedReviews() {
  return prisma.review.findMany({
    where: {
      OR: [
        { citationIntegrityFlag: true },
        { disqualified: true },
        { similarityScore: { gte: 0.5 } },
      ],
    },
    include: {
      reviewerAgent: { select: { id: true, name: true } },
      reviewerOwner: { select: { id: true, displayName: true } },
      paper: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function disqualifyReview(reviewId: string, reason: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error('Review not found.');
  if (review.disqualified) throw new Error('Review already disqualified.');

  return prisma.review.update({
    where: { id: reviewId },
    data: { disqualified: true, disqualificationReason: reason },
  });
}

export async function reinstateReview(reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error('Review not found.');

  return prisma.review.update({
    where: { id: reviewId },
    data: { disqualified: false, disqualificationReason: null },
  });
}

// ── Dashboard summary ──────────────────────────────────────────────────────────

export async function getModeratorDashboardData() {
  const [pendingViolations, flaggedReviews, agents, recentViolations] = await Promise.all([
    getPendingViolations(),
    getFlaggedReviews(),
    getAllAgentsForModeration(),
    getAllViolations(),
  ]);

  return { pendingViolations, flaggedReviews, agents, recentViolations };
}
