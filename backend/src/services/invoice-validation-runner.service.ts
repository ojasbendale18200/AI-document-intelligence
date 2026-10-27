import prisma from "../config/prisma.js";

import { invoiceExtractionSchema } from "../validators/invoice.validator.js";

import { validateInvoice } from "./invoice-validation.service.js";

export class InvoiceValidationRunnerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "InvoiceValidationRunnerError";
  }
}

export async function runInvoiceValidation(documentId: string) {
  const invoiceRecord = await prisma.invoice.findUnique({
    where: {
      documentId,
    },
  });

  if (!invoiceRecord) {
    throw new InvoiceValidationRunnerError(
      "Invoice extraction must be completed first",
      "INVOICE_NOT_FOUND",
    );
  }

  // Reconstruct and validate the invoice data from the database.
  const invoiceData = invoiceExtractionSchema.parse({
    invoiceNumber: invoiceRecord.invoiceNumber,
    invoiceDate: invoiceRecord.invoiceDate,
    dueDate: invoiceRecord.dueDate,

    supplierName: invoiceRecord.supplierName,
    supplierTaxId: invoiceRecord.supplierTaxId,

    customerName: invoiceRecord.customerName,
    customerTaxId: invoiceRecord.customerTaxId,

    purchaseOrderNumber: invoiceRecord.purchaseOrderNumber,
    currency: invoiceRecord.currency,

    lineItems: invoiceRecord.lineItems,

    subtotal: invoiceRecord.subtotal,
    taxRatePercent: invoiceRecord.taxRatePercent,
    taxAmount: invoiceRecord.taxAmount,
    totalAmount: invoiceRecord.totalAmount,

    paymentTerms: invoiceRecord.paymentTerms,
  });

  const result = validateInvoice(invoiceData);

  // Save the validation result.
  await prisma.$transaction(async (transaction) => {
    await transaction.invoice.update({
      where: {
        documentId,
      },
      data: {
        validationPassed: result.passed,
        validationDecision: result.decision,
        validationIssues: result.issues,
        validatedAt: new Date(),
      },
    });

    await transaction.document.update({
      where: {
        id: documentId,
      },
      data: {
        status: result.passed ? "VALIDATION_PASSED" : "REVIEW_REQUIRED",
      },
    });
  });
}
