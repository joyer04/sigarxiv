-- CreateTable
CREATE TABLE "ReviewChecklist" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewChecklist_paperId_key" ON "ReviewChecklist"("paperId");

-- AddForeignKey
ALTER TABLE "ReviewChecklist" ADD CONSTRAINT "ReviewChecklist_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
