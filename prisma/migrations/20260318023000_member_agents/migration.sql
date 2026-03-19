-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Team" ADD CONSTRAINT "Team_name_key" UNIQUE ("name");

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerId" TEXT NOT NULL,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_slug_key" ON "Agent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_ownerId_name_key" ON "Agent"("ownerId", "name");

-- AlterTable
ALTER TABLE "Review" RENAME COLUMN "reviewerId" TO "reviewerOwnerId";

-- AlterTable
ALTER TABLE "Review"
    ADD COLUMN "reviewerAgentId" TEXT NOT NULL,
    ADD COLUMN "reviewerTeamId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Review_paperId_reviewerAgentId_key" ON "Review"("paperId", "reviewerAgentId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_reviewerId_fkey";

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerOwnerId_fkey" FOREIGN KEY ("reviewerOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerAgentId_fkey" FOREIGN KEY ("reviewerAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerTeamId_fkey" FOREIGN KEY ("reviewerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Guard invalid ownership and team relationships even if the API layer is bypassed.
CREATE OR REPLACE FUNCTION "prevent_invalid_agent_review"()
RETURNS TRIGGER AS $$
DECLARE
    submitted_by_id TEXT;
    submitted_by_team_id TEXT;
BEGIN
    SELECT p."submittedById", u."teamId"
    INTO submitted_by_id, submitted_by_team_id
    FROM "Paper" p
    JOIN "User" u ON u."id" = p."submittedById"
    WHERE p."id" = NEW."paperId";

    IF submitted_by_id IS NULL THEN
        RAISE EXCEPTION 'Invalid paper reference for review submission.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM "Agent" a
        WHERE a."id" = NEW."reviewerAgentId"
          AND a."ownerId" = NEW."reviewerOwnerId"
          AND a."status" = 'ACTIVE'
          AND a."teamId" IS NOT DISTINCT FROM NEW."reviewerTeamId"
    ) THEN
        RAISE EXCEPTION 'Invalid reviewer agent ownership, status, or team audit data.';
    END IF;

    IF NEW."reviewerOwnerId" = submitted_by_id THEN
        RAISE EXCEPTION 'Self-review blocked: reviewer owner matches the paper submitter.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "PaperAuthor" pa
        WHERE pa."paperId" = NEW."paperId"
          AND pa."userId" = NEW."reviewerOwnerId"
    ) THEN
        RAISE EXCEPTION 'Self-review blocked: reviewer owner is a paper author.';
    END IF;

    IF NEW."reviewerTeamId" IS NOT NULL AND submitted_by_team_id IS NOT NULL AND NEW."reviewerTeamId" = submitted_by_team_id THEN
        RAISE EXCEPTION 'Same-team review blocked: reviewer team matches the submitting team.';
    END IF;

    IF NEW."reviewerTeamId" IS NOT NULL AND EXISTS (
        SELECT 1
        FROM "PaperAuthor" pa
        JOIN "User" u ON u."id" = pa."userId"
        WHERE pa."paperId" = NEW."paperId"
          AND u."teamId" IS NOT NULL
          AND u."teamId" = NEW."reviewerTeamId"
    ) THEN
        RAISE EXCEPTION 'Same-team review blocked: reviewer team matches a paper author team.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "review_agent_guard"
BEFORE INSERT OR UPDATE ON "Review"
FOR EACH ROW
EXECUTE FUNCTION "prevent_invalid_agent_review"();
