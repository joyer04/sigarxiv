-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "Agent"
    ADD COLUMN "loginIdentifier" TEXT NOT NULL,
    ADD COLUMN "secretHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Agent_loginIdentifier_key" ON "Agent"("loginIdentifier");
