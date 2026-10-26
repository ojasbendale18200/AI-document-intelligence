import { z } from "zod";

export const invoiceLineItemSchema = z.object({
  description: z.string(),

  quantity: z.number().nullable(),

  unitPrice: z.number().nullable(),

  amount: z.number().nullable(),
});

export const invoiceExtractionSchema = z.object({
  invoiceNumber: z.string().nullable(),

  invoiceDate: z.string().nullable(),

  dueDate: z.string().nullable(),

  supplierName: z.string().nullable(),

  supplierTaxId: z.string().nullable(),

  customerName: z.string().nullable(),

  customerTaxId: z.string().nullable(),

  purchaseOrderNumber: z.string().nullable(),

  currency: z.string().nullable(),

  lineItems: z.array(invoiceLineItemSchema),

  subtotal: z.number().nullable(),

  taxRatePercent: z.number().nullable(),

  taxAmount: z.number().nullable(),

  totalAmount: z.number().nullable(),

  paymentTerms: z.string().nullable(),
});

export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
