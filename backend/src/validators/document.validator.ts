import { z } from "zod";

export const createDocumentSchema = z.object({
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(255, "Filename must be at most 255 characters"),
});

export const updateDocumentSchema = z
  .object({
    filename: z
      .string()
      .trim()
      .min(1, "Filename is required")
      .max(255, "Filename must be at most 255 characters")
      .optional(),

    status: z
      .enum([
        "UPLOADED",
        "PROCESSING",
        "REVIEW_REQUIRED",
        "APPROVED",
        "REJECTED",
        "FAILED",
      ])
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
