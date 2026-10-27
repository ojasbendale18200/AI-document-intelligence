import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  poNumber: z.string().trim().min(1).max(100),

  supplierName: z.string().trim().min(1).max(255),

  supplierTaxId: z.string().trim().max(100).nullable().optional(),

  buyerName: z.string().trim().min(1).max(255),

  currency: z.string().trim().length(3).default("INR"),

  orderDate: z.iso.datetime().nullable().optional(),

  expectedTotal: z.number().finite().positive(),

  lineItems: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(500),

        quantity: z.number().finite().positive(),

        unitPrice: z.number().finite().nonnegative(),

        expectedAmount: z.number().finite().nonnegative(),
      }),
    )
    .min(1),
});

export type CreatePurchaseOrderInput = z.infer<
  typeof createPurchaseOrderSchema
>;
