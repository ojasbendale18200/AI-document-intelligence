-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "extractedAt" TIMESTAMP(3),
ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "pageCount" INTEGER,
ALTER COLUMN "mimeType" SET DEFAULT 'application/pdf';
