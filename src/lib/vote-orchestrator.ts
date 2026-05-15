import OpenAI from 'openai';
import { prisma } from './prisma';

export interface VoteResult {
  paperId: string;
  reviewsEvaluated: number;
  voterCount: number;
  votes: Array<{
    reviewId: string;
    voterId: string;
    score: number;
    rationale: string;
  }>;
}

const VOTERS_PER_PAPER = 3;

interface RawVoteDecision {
  reviewId: unknown;
  score: unknown;
  rationale: unknown;
}

export async function orchestrateVoting(paperId: string): Promise<VoteResult> {
  const reviews = await prisma.review.findMany({
    where: { paperId, disqualified: false },
    include: { reviewerAgent: true },
    orderBy: { createdAt: 'asc' },
  });

  if (reviews.length === 0) {
    return { paperId, reviewsEvaluated: 0, voterCount: 0, votes: [] };
  }

  const reviewerAgentIds = new Set(reviews.map((r) => r.reviewerAgentId));

  // Voters must not have reviewed this paper and must be ACTIVE
  const candidateVoters = await prisma.agent.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: Array.from(reviewerAgentIds) },
    },
    orderBy: { createdAt: 'asc' },
  });

  const voters = candidateVoters.slice(0, VOTERS_PER_PAPER);
  if (voters.length === 0) {
    return { paperId, reviewsEvaluated: reviews.length, voterCount: 0, votes: [] };
  }

  const reviewSummaries = reviews.map((r) => ({
    id: r.id,
    agentName: r.reviewerAgent.name,
    coreClaim: r.coreClaim,
    assumptions: r.assumptions,
    failureMode: r.failureMode,
    verificationProposal: r.verificationProposal,
    logicalWeakness: r.logicalWeakness,
    rubricTotal:
      (r.rubricNovelty ?? 0) +
      (r.rubricSoundness ?? 0) +
      (r.rubricImpact ?? 0) +
      (r.rubricClarity ?? 0) +
      (r.rubricValidation ?? 0) +
      (r.rubricReproducibility ?? 0) +
      (r.rubricEthics ?? 0),
    recommendation: r.recommendation,
  }));

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
  const allVotes: VoteResult['votes'] = [];

  for (const voter of voters) {
    const prompt = buildVotingPrompt(voter.name, voter.specialty, reviewSummaries);

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = JSON.parse(content) as { votes: RawVoteDecision[] };
      if (!Array.isArray(parsed.votes)) continue;

      for (const raw of parsed.votes) {
        const reviewId = String(raw.reviewId ?? '');
        const score = Math.max(1, Math.min(5, Math.round(Number(raw.score ?? 3))));
        const rationale = String(raw.rationale ?? '');

        if (!reviews.some((r) => r.id === reviewId)) continue;

        try {
          await prisma.agentReviewVote.upsert({
            where: { reviewId_voterId: { reviewId, voterId: voter.id } },
            create: { reviewId, voterId: voter.id, score, rationale },
            update: { score, rationale },
          });

          allVotes.push({ reviewId, voterId: voter.id, score, rationale });
        } catch {
          // skip duplicate constraint errors
        }
      }
    } catch {
      // voter failed — continue with next voter
    }
  }

  // Recompute upvoteCount for each review based on agent votes
  for (const review of reviews) {
    const voteAgg = await prisma.agentReviewVote.aggregate({
      where: { reviewId: review.id },
      _avg: { score: true },
      _count: { score: true },
    });

    const avgScore = voteAgg._avg.score ?? 0;
    const voteCount = voteAgg._count.score;
    // upvoteCount stores scaled average: avg_score * voter_count for ranking
    await prisma.review.update({
      where: { id: review.id },
      data: { upvoteCount: Math.round(avgScore * voteCount) },
    });
  }

  return {
    paperId,
    reviewsEvaluated: reviews.length,
    voterCount: voters.length,
    votes: allVotes,
  };
}

function buildVotingPrompt(
  voterName: string,
  voterSpecialty: string,
  reviews: Array<{
    id: string;
    agentName: string;
    coreClaim: string;
    assumptions: string;
    failureMode: string;
    verificationProposal: string;
    logicalWeakness: string;
    rubricTotal: number;
    recommendation: string;
  }>,
): string {
  const reviewText = reviews
    .map(
      (r) =>
        `Review ID: ${r.id}
Reviewer: ${r.agentName}
Core Claim: ${r.coreClaim}
Assumptions: ${r.assumptions}
Failure Mode: ${r.failureMode}
Verification Proposal: ${r.verificationProposal}
Logical Weakness: ${r.logicalWeakness}
Rubric Total: ${r.rubricTotal}/15
Recommendation: ${r.recommendation}
---`,
    )
    .join('\n\n');

  return `You are ${voterName}, an expert in ${voterSpecialty}. Evaluate the quality of these peer reviews.

Score each review 1-5 based on:
- Depth and specificity of analysis
- Constructiveness and actionability of feedback
- Internal consistency (rubric score matches recommendation)
- Coverage of key concerns

${reviewText}

Respond with a JSON object:
{
  "votes": [
    { "reviewId": "<id>", "score": <1-5>, "rationale": "<one sentence>" },
    ...
  ]
}

Include one vote entry per review.`;
}
