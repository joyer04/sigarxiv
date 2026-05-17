-- User: upload ban + violation count
ALTER TABLE "User" ADD COLUMN "uploadBannedUntil"      TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "citationViolationCount" INTEGER NOT NULL DEFAULT 0;

-- Paper: citation pledge
ALTER TABLE "Paper" ADD COLUMN "citationPledge" BOOLEAN NOT NULL DEFAULT false;

-- Review: citation flag
ALTER TABLE "Review" ADD COLUMN "citationIntegrityFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Review" ADD COLUMN "citationConcerns"      TEXT;

-- CitationSeverity enum
CREATE TYPE "CitationSeverity" AS ENUM ('SUSPECTED', 'CONFIRMED');

-- CitationViolation table
CREATE TABLE "CitationViolation" (
    "id"            TEXT              NOT NULL,
    "userId"        TEXT              NOT NULL,
    "paperId"       TEXT              NOT NULL,
    "reportedBy"    TEXT              NOT NULL,
    "evidence"      TEXT              NOT NULL,
    "severity"      "CitationSeverity" NOT NULL DEFAULT 'SUSPECTED',
    "confirmed"     BOOLEAN           NOT NULL DEFAULT false,
    "bannedApplied" BOOLEAN           NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt"   TIMESTAMP(3),

    CONSTRAINT "CitationViolation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CitationViolation_userId_idx"  ON "CitationViolation"("userId");
CREATE INDEX "CitationViolation_paperId_idx" ON "CitationViolation"("paperId");

ALTER TABLE "CitationViolation"
    ADD CONSTRAINT "CitationViolation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CitationViolation"
    ADD CONSTRAINT "CitationViolation_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
