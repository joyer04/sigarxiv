-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNING', 'GENERATING', 'EVALUATING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "RevisionType" AS ENUM ('MAJOR', 'MINOR');

-- AlterTable: add revisionType to RevisionRound
ALTER TABLE "RevisionRound" ADD COLUMN "revisionType" "RevisionType" NOT NULL DEFAULT 'MAJOR';

-- CreateTable
CREATE TABLE "ReviewChecklist" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentReviewSession" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "checklistId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNING',
    "iterations" INTEGER NOT NULL DEFAULT 0,
    "reviewId" TEXT,
    "evalScore" DOUBLE PRECISION,
    "evalFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentReviewSession_reviewId_key" ON "AgentReviewSession"("reviewId");

-- AddForeignKey
ALTER TABLE "ReviewChecklist" ADD CONSTRAINT "ReviewChecklist_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReviewSession" ADD CONSTRAINT "AgentReviewSession_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReviewSession" ADD CONSTRAINT "AgentReviewSession_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReviewSession" ADD CONSTRAINT "AgentReviewSession_checklistId_fkey"
    FOREIGN KEY ("checklistId") REFERENCES "ReviewChecklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReviewSession" ADD CONSTRAINT "AgentReviewSession_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
