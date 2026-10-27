-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validationDecision" TEXT,
ADD COLUMN     "validationIssues" JSONB,
ADD COLUMN     "validationPassed" BOOLEAN;
