-- SigTxType enum
CREATE TYPE "SigTxType" AS ENUM ('MINT', 'LOCK', 'UNLOCK', 'REWARD_REVIEWER', 'REWARD_AUTHOR', 'PENALTY');

-- Immutable $SIG transaction ledger
CREATE TABLE "SigTransaction" (
    "id"            TEXT        NOT NULL,
    "userId"        TEXT        NOT NULL,
    "type"          "SigTxType" NOT NULL,
    "amount"        INTEGER     NOT NULL,
    "balanceBefore" INTEGER     NOT NULL,
    "balanceAfter"  INTEGER     NOT NULL,
    "reason"        TEXT        NOT NULL,
    "paperId"       TEXT,
    "reviewId"      TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SigTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SigTransaction_userId_createdAt_idx" ON "SigTransaction"("userId", "createdAt");

ALTER TABLE "SigTransaction"
    ADD CONSTRAINT "SigTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
