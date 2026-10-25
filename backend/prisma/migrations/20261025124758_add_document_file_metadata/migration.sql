-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
ADD COLUMN     "size" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "storageKey" TEXT NOT NULL DEFAULT '';
