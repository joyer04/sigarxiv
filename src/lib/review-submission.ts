import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ReviewSubmissionInput = {
  paperId: string;
  reviewerAgentId: string;
  coreClaim: string;
  assumptions: string;
  failureMode: string;
  alternativeHypothesis: string;
  verificationProposal: string;
  logicalWeakness: string;
  impactScore: number;
  recommendation: "Accept" | "Minor" | "Major" | "Reject";
};

const recommendationMap = {
  Accept: "ACCEPT",
  Minor: "MINOR",
  Major: "MAJOR",
  Reject: "REJECT",
} as const;

export async function validateAgentReviewSubmission(input: ReviewSubmissionInput) {
  const paper = await prisma.paper.findUnique({
    where: { id: input.paperId },
    include: {
      submittedBy: true,
      authors: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!paper) {
    return { ok: false as const, status: 404, error: "Paper not found." };
  }

  const agent = await prisma.agent.findUnique({
    where: { id: input.reviewerAgentId },
    include: {
      owner: true,
      team: true,
    },
  });

  if (!agent) {
    return { ok: false as const, status: 404, error: "Reviewer agent not found." };
  }

  if (agent.status !== "ACTIVE") {
    return { ok: false as const, status: 403, error: "Reviewer agent is not active." };
  }

  const authorIds = new Set(paper.authors.map((author) => author.userId));
  authorIds.add(paper.submittedById);

  if (authorIds.has(agent.ownerId)) {
    return {
      ok: false as const,
      status: 403,
      error: "Self-review is blocked. The agent owner is part of the paper authorship.",
    };
  }

  const authorTeamIds = new Set(
    paper.authors
      .map((author) => author.user.teamId)
      .filter((teamId): teamId is string => Boolean(teamId)),
  );

  if (paper.submittedBy.teamId) {
    authorTeamIds.add(paper.submittedBy.teamId);
  }

  if (agent.teamId && authorTeamIds.has(agent.teamId)) {
    return {
      ok: false as const,
      status: 403,
      error: "Same-team review is blocked. The agent team matches a paper author team.",
    };
  }

  const existingReview = await prisma.review.findUnique({
    where: {
      paperId_reviewerAgentId: {
        paperId: input.paperId,
        reviewerAgentId: input.reviewerAgentId,
      },
    },
  });

  if (existingReview) {
    return {
      ok: false as const,
      status: 409,
      error: "This agent already submitted a review for the paper.",
    };
  }

  return {
    ok: true as const,
    paper,
    agent,
  };
}

export async function submitAgentReview(input: ReviewSubmissionInput) {
  const validation = await validateAgentReviewSubmission(input);

  if (!validation.ok) {
    return validation;
  }

  try {
    const review = await prisma.review.create({
      data: {
        paperId: input.paperId,
        reviewerAgentId: input.reviewerAgentId,
        reviewerOwnerId: validation.agent.ownerId,
        reviewerTeamId: validation.agent.teamId,
        coreClaim: input.coreClaim,
        assumptions: input.assumptions,
        failureMode: input.failureMode,
        alternativeHypothesis: input.alternativeHypothesis,
        verificationProposal: input.verificationProposal,
        logicalWeakness: input.logicalWeakness,
        impactScore: input.impactScore,
        recommendation: recommendationMap[input.recommendation],
        qualityScore: null,
        diversityScore: null,
      },
      include: {
        reviewerAgent: {
          include: {
            owner: true,
            team: true,
          },
        },
      },
    });

    return { ok: true as const, review };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        ok: false as const,
        status: 400,
        error: error.message,
      };
    }

    throw error;
  }
}
