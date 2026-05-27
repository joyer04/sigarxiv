ALTER TABLE "CitationViolation" ADD COLUMN "dismissed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CitationViolation" ADD COLUMN "dismissedAt" TIMESTAMP(3);
ALTER TABLE "CitationViolation" ADD COLUMN "dismissedBy" TEXT;
