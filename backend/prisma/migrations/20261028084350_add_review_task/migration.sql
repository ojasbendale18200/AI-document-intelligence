-- CreateTable
CREATE TABLE "ReviewTask" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reasonCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" JSONB,
    "decision" TEXT,
    "reviewerComment" TEXT,
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTask_threadId_key" ON "ReviewTask"("threadId");

-- CreateIndex
CREATE INDEX "ReviewTask_status_createdAt_idx" ON "ReviewTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewTask_documentId_idx" ON "ReviewTask"("documentId");

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
