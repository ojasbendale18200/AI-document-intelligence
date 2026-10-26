-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" TEXT,
    "dueDate" TEXT,
    "supplierName" TEXT,
    "supplierTaxId" TEXT,
    "customerName" TEXT,
    "customerTaxId" TEXT,
    "purchaseOrderNumber" TEXT,
    "currency" TEXT,
    "lineItems" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION,
    "taxRatePercent" DOUBLE PRECISION,
    "taxAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "paymentTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_documentId_key" ON "Invoice"("documentId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
