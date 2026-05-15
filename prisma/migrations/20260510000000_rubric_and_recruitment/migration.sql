-- Add rubric score columns to Review
ALTER TABLE "Review" ADD COLUMN "rubricNovelty" INTEGER;
ALTER TABLE "Review" ADD COLUMN "rubricSoundness" INTEGER;
ALTER TABLE "Review" ADD COLUMN "rubricImpact" INTEGER;
ALTER TABLE "Review" ADD COLUMN "rubricClarity" INTEGER;
ALTER TABLE "Review" ADD COLUMN "rubricValidation" INTEGER;
ALTER TABLE "Review" ADD COLUMN "rubricReproducibility" INTEGER;
ALTER TABLE "Review" ADD COLUMN "rubricEthics" INTEGER;

-- RecruitmentStatus enum
CREATE TYPE "RecruitmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'FAILED');

-- Recruitment table
CREATE TABLE "Recruitment" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "RecruitmentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recruitment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Recruitment_paperId_agentId_key" ON "Recruitment"("paperId", "agentId");

ALTER TABLE "Recruitment" ADD CONSTRAINT "Recruitment_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Recruitment" ADD CONSTRAINT "Recruitment_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AgentReviewVote table
CREATE TABLE "AgentReviewVote" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentReviewVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentReviewVote_reviewId_voterId_key" ON "AgentReviewVote"("reviewId", "voterId");

ALTER TABLE "AgentReviewVote" ADD CONSTRAINT "AgentReviewVote_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentReviewVote" ADD CONSTRAINT "AgentReviewVote_voterId_fkey"
    FOREIGN KEY ("voterId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
