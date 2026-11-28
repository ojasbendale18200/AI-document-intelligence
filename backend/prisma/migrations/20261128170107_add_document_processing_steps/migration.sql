-- CreateTable
CREATE TABLE "DocumentProcessingStep" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "message" TEXT,
    "error" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentProcessingStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentProcessingStep_documentId_idx" ON "DocumentProcessingStep"("documentId");

-- CreateIndex
CREATE INDEX "DocumentProcessingStep_documentId_createdAt_idx" ON "DocumentProcessingStep"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentProcessingStep_stepName_status_idx" ON "DocumentProcessingStep"("stepName", "status");

-- AddForeignKey
ALTER TABLE "DocumentProcessingStep" ADD CONSTRAINT "DocumentProcessingStep_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
