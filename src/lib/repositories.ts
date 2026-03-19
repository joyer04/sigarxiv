import { prisma } from "@/lib/prisma";
import {
  Paper,
  PaperStatus,
  Recommendation,
  RevisionRound,
  Review,
  ReviewerProfile,
  papers as fallbackPapers,
  platformMetrics as fallbackPlatformMetrics,
  reviewAgents as fallbackReviewAgents,
  reviewerProfiles as fallbackReviewerProfiles,
  reviews as fallbackReviews,
} from "@/lib/data";
import { computeCompositeScore } from "@/lib/review";

function mapStatus(status: string): PaperStatus {
  switch (status) {
    case "UNDER_REVIEW":
      return "Under Review";
    case "IN_REVISION":
      return "In Revision";
    case "PUBLISHED":
      return "Published";
    default:
      return "Draft";
  }
}

function mapRecommendation(recommendation: string): Recommendation {
  switch (recommendation) {
    case "ACCEPT":
      return "Accept";
    case "MINOR":
      return "Minor";
    case "MAJOR":
      return "Major";
    default:
      return "Reject";
  }
}

function mapRevisionStatus(status: string): RevisionRound["status"] {
  switch (status) {
    case "ADDRESSED":
      return "Addressed";
    case "APPROVED":
      return "Approved";
    case "ESCALATED":
      return "Escalated";
    default:
      return "Required";
  }
}

async function canUseDatabase() {
  if (!process.env.DATABASE_URL) {
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

function normalizePaper(record: {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  category: string;
  status: string;
  creditsLocked: number;
  roundsRequired: number;
  contentMarkdown: string;
  createdAt: Date;
  revisions: {
    roundNumber: number;
    status: string;
    reviewerSummary: string;
    authorResponse: string | null;
    reviewerDecision: string | null;
  }[];
  authors: {
    sortOrder: number;
    user: {
      displayName: string;
    };
  }[];
}) {
  const content = record.contentMarkdown
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    abstract: record.abstract,
    authors: record.authors
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((author) => author.user.displayName),
    status: mapStatus(record.status),
    category: record.category,
    submittedAt: record.createdAt.toISOString().slice(0, 10),
    reviewRequested: record.creditsLocked > 0,
    creditsLocked: record.creditsLocked,
    roundsRequired: record.roundsRequired,
    overview: content.slice(0, 3),
    content,
    revisionHistory: record.revisions
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .map((revision) => ({
        round: revision.roundNumber,
        status: mapRevisionStatus(revision.status),
        summary: revision.reviewerSummary,
        authorResponse: revision.authorResponse ?? "Pending author response.",
        reviewerDecision: revision.reviewerDecision ?? "Round open.",
      })),
  } satisfies Paper;
}

function normalizeReview(record: {
  id: string;
  paperId: string;
  coreClaim: string;
  assumptions: string;
  failureMode: string;
  alternativeHypothesis: string;
  verificationProposal: string;
  logicalWeakness: string;
  impactScore: number;
  recommendation: string;
  qualityScore: number | null;
  diversityScore: number | null;
  upvoteCount: number;
  similarityScore: number | null;
  selectedTop3: boolean;
  reviewerAgent: {
    name: string;
    owner: {
      displayName: string;
    };
    team: {
      name: string;
    } | null;
  };
}) {
  const similarityScore = record.similarityScore ?? 0;
  const similarityRisk =
    similarityScore >= 0.8 ? "high" : similarityScore >= 0.45 ? "medium" : "low";

  return {
    id: record.id,
    paperId: record.paperId,
    reviewer: record.reviewerAgent.name,
    reviewerOwner: record.reviewerAgent.owner.displayName,
    affiliation: record.reviewerAgent.team?.name ?? "Independent",
    qualityScore: Math.round(record.qualityScore ?? 0),
    diversityScore: Math.round(record.diversityScore ?? 0),
    upvotes: record.upvoteCount,
    similarityRisk,
    coreClaim: record.coreClaim,
    assumptions: record.assumptions,
    failureMode: record.failureMode,
    alternativeHypothesis: record.alternativeHypothesis,
    verificationProposal: record.verificationProposal,
    logicalWeakness: record.logicalWeakness,
    impactScore: Math.max(1, Math.min(5, record.impactScore)) as Review["impactScore"],
    recommendation: mapRecommendation(record.recommendation),
    selected: record.selectedTop3,
  } satisfies Review;
}

export async function getPaperSummaries() {
  if (!(await canUseDatabase())) {
    return fallbackPapers;
  }

  const records = await prisma.paper.findMany({
    include: {
      authors: {
        include: {
          user: true,
        },
      },
      revisions: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return records.map(normalizePaper);
}

export async function getPaperBySlugFromDb(slug: string) {
  if (!(await canUseDatabase())) {
    return fallbackPapers.find((paper) => paper.slug === slug) ?? null;
  }

  const record = await prisma.paper.findUnique({
    where: { slug },
    include: {
      authors: {
        include: {
          user: true,
        },
      },
      revisions: true,
    },
  });

  return record ? normalizePaper(record) : null;
}

export async function getReviewsForPaperId(paperId: string) {
  if (!(await canUseDatabase())) {
    return fallbackReviews.filter((review) => review.paperId === paperId);
  }

  const records = await prisma.review.findMany({
    where: { paperId },
    include: {
      reviewerAgent: {
        include: {
          owner: true,
          team: true,
        },
      },
    },
    orderBy: [{ selectedTop3: "desc" }, { qualityScore: "desc" }],
  });

  return records.map(normalizeReview);
}

export async function getPublishedPapers() {
  const allPapers = await getPaperSummaries();
  return allPapers.filter((paper) => paper.status === "Published");
}

export async function getPlatformMetrics() {
  if (!(await canUseDatabase())) {
    return fallbackPlatformMetrics;
  }

  const [papers, underReview, published, reviewPool, creditsLocked] = await Promise.all([
    prisma.paper.count(),
    prisma.paper.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.paper.count({ where: { status: "PUBLISHED" } }),
    prisma.review.count(),
    prisma.paper.aggregate({
      _sum: {
        creditsLocked: true,
      },
    }),
  ]);

  return {
    papers,
    underReview,
    published,
    reviewPool,
    creditsHeld: creditsLocked._sum.creditsLocked ?? 0,
  };
}

export async function getReviewerDashboard() {
  if (!(await canUseDatabase())) {
    return {
      profiles: fallbackReviewerProfiles,
      submittedReviews: fallbackReviews,
    };
  }

  const reviewers = await prisma.user.findMany({
    where: {
      role: "REVIEWER",
    },
    include: {
      ownedAgents: {
        include: {
          reviews: true,
        },
      },
    },
  });

  const profiles: ReviewerProfile[] = reviewers
    .flatMap((reviewer) =>
      reviewer.ownedAgents.map((agent) => {
        const acceptedTopReviews = agent.reviews.filter((review) => review.selectedTop3).length;
        const score =
          agent.reviews.length === 0
            ? 0
            : Math.round(
                agent.reviews.reduce((sum, review) => {
                  return (
                    sum +
                    computeCompositeScore(
                      review.qualityScore ?? 0,
                      review.diversityScore ?? 0,
                      review.upvoteCount,
                    )
                  );
                }, 0) / agent.reviews.length,
              );

        return {
          name: agent.name,
          owner: reviewer.displayName,
          rank: 0,
          score,
          credits: reviewer.sigCreditBalance,
          submittedReviews: agent.reviews.length,
          acceptedTopReviews,
          flags: reviewer.penalties,
        };
      }),
    )
    .sort((a, b) => b.score - a.score)
    .map((profile, index) => ({
      ...profile,
      rank: index + 1,
    }));

  const submittedReviews = await prisma.review.findMany({
    include: {
      reviewerAgent: {
        include: {
          owner: true,
          team: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    profiles,
    submittedReviews: submittedReviews.map(normalizeReview),
  };
}

export async function getReviewAgents() {
  if (!(await canUseDatabase())) {
    return fallbackReviewAgents.map((agent) => ({
      id: agent.slug,
      slug: agent.slug,
      name: agent.name,
      modelName: agent.modelName,
      specialty: agent.specialty,
      status: "ACTIVE" as const,
      owner: {
        displayName: agent.owner,
      },
      team: agent.teamName
        ? {
            name: agent.teamName,
          }
        : null,
    }));
  }

  return prisma.agent.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      owner: true,
      team: true,
    },
    orderBy: [{ owner: { displayName: "asc" } }, { name: "asc" }],
  });
}
