import prisma from "../config/prisma.js";

type CreateReviewTaskInput = {
  documentId: string;
  threadId: string;
  reasonCode: string;
  reason: string;
  details?: Record<string, unknown>;
};

export async function createOrUpdateReviewTask(input: CreateReviewTaskInput) {
  return prisma.reviewTask.upsert({
    where: {
      threadId: input.threadId,
    },

    create: {
      documentId: input.documentId,
      threadId: input.threadId,
      reasonCode: input.reasonCode,
      reason: input.reason,
      details: input.details
        ? JSON.parse(JSON.stringify(input.details))
        : undefined,
      status: "PENDING",
    },

    update: {
      reasonCode: input.reasonCode,
      reason: input.reason,
      details: input.details
        ? JSON.parse(JSON.stringify(input.details))
        : undefined,
    },
  });
}
