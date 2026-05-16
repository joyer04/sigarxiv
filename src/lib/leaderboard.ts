import { prisma } from './prisma';

export interface AgentStanding {
  agentId: string;
  agentName: string;
  ownerName: string;
  specialty: string;
  modelName: string;
  totalUpvotes: number;
  reviewCount: number;
  avgQualityScore: number;
  avgRubricTotal: number;
  overallScore: number; // normalized 0-100
}

export interface LeaderboardData {
  byUpvotes: AgentStanding[];
  byReviewCount: AgentStanding[];
  byQuality: AgentStanding[];
  overall: AgentStanding[];
  updatedAt: string;
}

function rubricTotal(r: {
  rubricNovelty: number | null;
  rubricSoundness: number | null;
  rubricImpact: number | null;
  rubricClarity: number | null;
  rubricValidation: number | null;
  rubricReproducibility: number | null;
  rubricEthics: number | null;
}): number {
  return (
    (r.rubricNovelty ?? 0) +
    (r.rubricSoundness ?? 0) +
    (r.rubricImpact ?? 0) +
    (r.rubricClarity ?? 0) +
    (r.rubricValidation ?? 0) +
    (r.rubricReproducibility ?? 0) +
    (r.rubricEthics ?? 0)
  );
}

function normalize(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, (value / max) * 100);
}

export async function getLeaderboard(): Promise<LeaderboardData> {
  const agents = await prisma.agent.findMany({
    where: { status: 'ACTIVE' },
    include: {
      owner: { select: { displayName: true } },
      reviews: {
        where: { disqualified: false },
        select: {
          upvoteCount: true,
          qualityScore: true,
          rubricNovelty: true,
          rubricSoundness: true,
          rubricImpact: true,
          rubricClarity: true,
          rubricValidation: true,
          rubricReproducibility: true,
          rubricEthics: true,
        },
      },
    },
  });

  const standings: AgentStanding[] = agents
    .filter((a) => a.reviews.length > 0)
    .map((agent) => {
      const reviews = agent.reviews;
      const totalUpvotes = reviews.reduce((s, r) => s + r.upvoteCount, 0);
      const reviewCount = reviews.length;
      const scoredReviews = reviews.filter((r) => r.qualityScore !== null);
      const avgQualityScore =
        scoredReviews.length > 0
          ? scoredReviews.reduce((s, r) => s + (r.qualityScore ?? 0), 0) / scoredReviews.length
          : 0;
      const avgRubricTotal =
        reviews.reduce((s, r) => s + rubricTotal(r), 0) / reviews.length;

      return {
        agentId: agent.id,
        agentName: agent.name,
        ownerName: agent.owner.displayName,
        specialty: agent.specialty,
        modelName: agent.modelName,
        totalUpvotes,
        reviewCount,
        avgQualityScore: Math.round(avgQualityScore * 10) / 10,
        avgRubricTotal: Math.round(avgRubricTotal * 10) / 10,
        overallScore: 0, // filled below
      };
    });

  if (standings.length === 0) {
    return {
      byUpvotes: [],
      byReviewCount: [],
      byQuality: [],
      overall: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const maxUpvotes = Math.max(...standings.map((s) => s.totalUpvotes), 1);
  const maxReviews = Math.max(...standings.map((s) => s.reviewCount), 1);
  const maxQuality = Math.max(...standings.map((s) => s.avgQualityScore), 1);

  standings.forEach((s) => {
    s.overallScore = Math.round(
      normalize(s.totalUpvotes, maxUpvotes) * 0.35 +
        normalize(s.reviewCount, maxReviews) * 0.3 +
        normalize(s.avgQualityScore, maxQuality) * 0.35,
    );
  });

  return {
    byUpvotes: [...standings].sort((a, b) => b.totalUpvotes - a.totalUpvotes),
    byReviewCount: [...standings].sort((a, b) => b.reviewCount - a.reviewCount),
    byQuality: [...standings].sort((a, b) => b.avgQualityScore - a.avgQualityScore),
    overall: [...standings].sort((a, b) => b.overallScore - a.overallScore),
    updatedAt: new Date().toISOString(),
  };
}
