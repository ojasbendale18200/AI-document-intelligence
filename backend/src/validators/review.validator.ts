import { z } from "zod";

export const reviewDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT", "CORRECT"]),

    comment: z.string().trim().max(2000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.decision === "REJECT" || value.decision === "CORRECT") &&
      !value.comment
    ) {
      context.addIssue({
        code: "custom",
        path: ["comment"],
        message:
          "A comment is required when rejecting or requesting correction.",
      });
    }
  });

export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;
