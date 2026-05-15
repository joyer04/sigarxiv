import { prisma } from './prisma';
import { orchestrateReview } from './review-orchestrator';

export interface RecruitmentResult {
  paperId: string;
  recruited: string[];   // agent IDs
  skipped: string[];     // agent IDs filtered out (self/team conflict)
  results: Array<{
    agentId: string;
    agentName: string;
    success: boolean;
    reviewId?: string;
    error?: string;
  }>;
}

const DEFAULT_REVIEWER_COUNT = 4;

export async function recruitAndReview(
  paperId: string,
  count = DEFAULT_REVIEWER_COUNT,
): Promise<RecruitmentResult> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      authors: { include: { user: true } },
      submittedBy: true,
    },
  });

  if (!paper) throw new Error(`Paper not found: ${paperId}`);

  const authorIds = new Set([
    paper.submittedById,
    ...paper.authors.map((a) => a.userId),
  ]);
  const authorTeamIds = new Set(
    [paper.submittedBy.teamId, ...paper.authors.map((a) => a.user.teamId)]
      .filter((id): id is string => Boolean(id)),
  );

  const allAgents = await prisma.agent.findMany({
    where: { status: 'ACTIVE' },
    include: { owner: true },
    orderBy: { createdAt: 'asc' },
  });

  const eligible: typeof allAgents = [];
  const skipped: string[] = [];

  for (const agent of allAgents) {
    const selfConflict = authorIds.has(agent.ownerId);
    const teamConflict = agent.teamId ? authorTeamIds.has(agent.teamId) : false;
    const alreadyRecruited = await prisma.recruitment.findUnique({
      where: { paperId_agentId: { paperId, agentId: agent.id } },
    });

    if (selfConflict || teamConflict || alreadyRecruited) {
      skipped.push(agent.id);
    } else {
      eligible.push(agent);
    }
  }

  // Prefer specialty diversity: pick agents with distinct specialties first
  const picked = pickDiverse(eligible, count);

  // Create Recruitment records (PENDING → IN_PROGRESS)
  await prisma.recruitment.createMany({
    data: picked.map((a) => ({ paperId, agentId: a.id })),
    skipDuplicates: true,
  });

  const results: RecruitmentResult['results'] = [];

  for (const agent of picked) {
    await prisma.recruitment.update({
      where: { paperId_agentId: { paperId, agentId: agent.id } },
      data: { status: 'IN_PROGRESS' },
    });

    const outcome = await orchestrateReview({ paperId, agentId: agent.id });

    if (outcome.success && outcome.reviewId) {
      await prisma.recruitment.update({
        where: { paperId_agentId: { paperId, agentId: agent.id } },
        data: { status: 'DONE', reviewId: outcome.reviewId },
      });
      results.push({ agentId: agent.id, agentName: agent.name, success: true, reviewId: outcome.reviewId });
    } else {
      await prisma.recruitment.update({
        where: { paperId_agentId: { paperId, agentId: agent.id } },
        data: { status: 'FAILED', error: outcome.error ?? 'unknown error' },
      });
      results.push({ agentId: agent.id, agentName: agent.name, success: false, error: outcome.error });
    }
  }

  return {
    paperId,
    recruited: picked.map((a) => a.id),
    skipped,
    results,
  };
}

function pickDiverse<T extends { specialty: string }>(agents: T[], count: number): T[] {
  const seen = new Set<string>();
  const picked: T[] = [];

  // First pass: one agent per specialty
  for (const agent of agents) {
    if (picked.length >= count) break;
    const key = agent.specialty.toLowerCase().split(/\s+/).slice(0, 2).join('-');
    if (!seen.has(key)) {
      seen.add(key);
      picked.push(agent);
    }
  }

  // Second pass: fill remaining slots from leftover agents
  for (const agent of agents) {
    if (picked.length >= count) break;
    if (!picked.includes(agent)) picked.push(agent);
  }

  return picked.slice(0, count);
}
