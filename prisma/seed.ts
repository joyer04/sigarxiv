import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PaperStatus, PrismaClient, Recommendation, RevisionStatus, UserRole } from "@prisma/client";
import { papers, reviewAgents, reviews } from "../src/lib/data";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const userRegistry = new Map<
  string,
  {
    email: string;
    displayName: string;
    role: UserRole;
    teamName?: string;
    sigCreditBalance: number;
    penalties: number;
  }
>();

const memberOverrides = new Map<
  string,
  {
    teamName?: string;
  }
>([["Ted Hong", { teamName: "Systems Lab 7" }]]);

function slugifyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ensureUser(
  displayName: string,
  role: UserRole,
  options: { teamName?: string; sigCreditBalance?: number; penalties?: number } = {},
) {
  const existing = userRegistry.get(displayName);

  if (existing) {
    if (role === "REVIEWER") {
      existing.role = "REVIEWER";
    }
    if (!existing.teamName && options.teamName) {
      existing.teamName = options.teamName;
    }
    return;
  }

  const override = memberOverrides.get(displayName);

  userRegistry.set(displayName, {
    email: `${slugifyName(displayName)}@sigarxiv.local`,
    displayName,
    role,
    teamName: options.teamName ?? override?.teamName,
    sigCreditBalance: options.sigCreditBalance ?? 100,
    penalties: options.penalties ?? 0,
  });
}

for (const paper of papers) {
  for (const author of paper.authors) {
    ensureUser(author, "AUTHOR");
  }
}

for (const agent of reviewAgents) {
  ensureUser(agent.owner, agent.ownerRole, {
    teamName: agent.teamName,
    sigCreditBalance: agent.credits,
    penalties: agent.flags,
  });
}

async function main() {
  await prisma.reviewVote.deleteMany();
  await prisma.review.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.revisionRound.deleteMany();
  await prisma.paperAuthor.deleteMany();
  await prisma.paper.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  const teamNames = Array.from(
    new Set(
      Array.from(userRegistry.values())
        .map((user) => user.teamName)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const teams = new Map<string, string>();

  for (const teamName of teamNames) {
    const team = await prisma.team.create({
      data: { name: teamName },
    });
    teams.set(teamName, team.id);
  }

  const users = new Map<string, string>();

  for (const user of userRegistry.values()) {
    const created = await prisma.user.create({
      data: {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        sigCreditBalance: user.sigCreditBalance,
        penalties: user.penalties,
        teamId: user.teamName ? teams.get(user.teamName) : undefined,
      },
    });
    users.set(user.displayName, created.id);
  }

  const agents = new Map<string, string>();

  for (const agent of reviewAgents) {
    const created = await prisma.agent.create({
      data: {
        slug: agent.slug,
        name: agent.name,
        modelName: agent.modelName,
        specialty: agent.specialty,
        ownerId: users.get(agent.owner)!,
        teamId: agent.teamName ? teams.get(agent.teamName) : undefined,
      },
    });
    agents.set(agent.name, created.id);
  }

  const paperIds = new Map<string, string>();

  for (const paper of papers) {
    const createdPaper = await prisma.paper.create({
      data: {
        slug: paper.slug,
        title: paper.title,
        category: paper.category,
        abstract: paper.abstract,
        contentMarkdown: paper.content.join("\n\n"),
        status:
          paper.status === "Under Review"
            ? PaperStatus.UNDER_REVIEW
            : paper.status === "In Revision"
              ? PaperStatus.IN_REVISION
              : paper.status === "Published"
                ? PaperStatus.PUBLISHED
                : PaperStatus.DRAFT,
        creditsLocked: paper.creditsLocked,
        roundsRequired: paper.roundsRequired,
        submittedById: users.get(paper.authors[0])!,
        createdAt: new Date(`${paper.submittedAt}T12:00:00Z`),
        publishedAt: paper.status === "Published" ? new Date() : null,
      },
    });

    paperIds.set(paper.id, createdPaper.id);

    for (const [index, author] of paper.authors.entries()) {
      await prisma.paperAuthor.create({
        data: {
          paperId: createdPaper.id,
          userId: users.get(author)!,
          sortOrder: index,
        },
      });
    }

    for (const revision of paper.revisionHistory) {
      await prisma.revisionRound.create({
        data: {
          paperId: createdPaper.id,
          roundNumber: revision.round,
          status:
            revision.status === "Addressed"
              ? RevisionStatus.ADDRESSED
              : revision.status === "Approved"
                ? RevisionStatus.APPROVED
                : revision.status === "Escalated"
                  ? RevisionStatus.ESCALATED
                  : RevisionStatus.REQUIRED,
          reviewerSummary: revision.summary,
          authorResponse: revision.authorResponse,
          reviewerDecision: revision.reviewerDecision,
        },
      });
    }
  }

  for (const review of reviews) {
    const agentSeed = reviewAgents.find((agent) => agent.name === review.reviewer);

    await prisma.review.create({
      data: {
        paperId: paperIds.get(review.paperId)!,
        reviewerAgentId: agents.get(review.reviewer)!,
        reviewerOwnerId: users.get(review.reviewerOwner)!,
        reviewerTeamId: agentSeed?.teamName ? teams.get(agentSeed.teamName) : undefined,
        coreClaim: review.coreClaim,
        assumptions: review.assumptions,
        failureMode: review.failureMode,
        alternativeHypothesis: review.alternativeHypothesis,
        verificationProposal: review.verificationProposal,
        logicalWeakness: review.logicalWeakness,
        impactScore: review.impactScore,
        recommendation:
          review.recommendation === "Accept"
            ? Recommendation.ACCEPT
            : review.recommendation === "Minor"
              ? Recommendation.MINOR
              : review.recommendation === "Major"
                ? Recommendation.MAJOR
                : Recommendation.REJECT,
        qualityScore: review.qualityScore,
        diversityScore: review.diversityScore,
        upvoteCount: review.upvotes,
        similarityScore:
          review.similarityRisk === "high"
            ? 0.92
            : review.similarityRisk === "medium"
              ? 0.56
              : 0.12,
        selectedTop3: review.selected,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
