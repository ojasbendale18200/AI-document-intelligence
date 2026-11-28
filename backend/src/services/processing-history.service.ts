import prisma from "../config/prisma.js";

interface StartProcessingStepInput {
  documentId: string;
  stepName: string;
  message?: string;
  attempt?: number;
}

export async function startProcessingStep(data: StartProcessingStepInput) {
  const processingStep = await prisma.documentProcessingStep.create({
    data: {
      documentId: data.documentId,
      stepName: data.stepName,
      status: "PROCESSING",
      startedAt: new Date(),
      message: data.message ?? null,
      attempt: data.attempt ?? 1,
    },
  });

  return processingStep;
}

interface CompleteProcessingStepInput {
  stepId: string;
  message?: string;
}

export async function completeProcessingStep(
  data: CompleteProcessingStepInput,
) {
  const existingStep = await prisma.documentProcessingStep.findUnique({
    where: {
      id: data.stepId,
    },
  });

  if (!existingStep) {
    throw new Error("PROCESSING_STEP_NOT_FOUND");
  }

  if (existingStep.status !== "PROCESSING") {
    throw new Error("PROCESSING_STEP_NOT_RUNNING");
  }

  const completedAt = new Date();

  const durationMs = existingStep.startedAt
    ? completedAt.getTime() - existingStep.startedAt.getTime()
    : null;

  const updatedStep = await prisma.documentProcessingStep.update({
    where: {
      id: data.stepId,
    },

    data: {
      status: "COMPLETED",
      completedAt,
      durationMs,
      message: data.message ?? existingStep.message,
      error: null,
    },
  });

  return updatedStep;
}

interface FailProcessingStepInput {
  stepId: string;
  error: string;
  message?: string;
}

export async function failProcessingStep(data: FailProcessingStepInput) {
  const existingStep = await prisma.documentProcessingStep.findUnique({
    where: {
      id: data.stepId,
    },
  });

  if (!existingStep) {
    throw new Error("PROCESSING_STEP_NOT_FOUND");
  }

  if (existingStep.status !== "PROCESSING") {
    throw new Error("PROCESSING_STEP_NOT_RUNNING");
  }

  const completedAt = new Date();

  const durationMs = existingStep.startedAt
    ? completedAt.getTime() - existingStep.startedAt.getTime()
    : null;

  return prisma.documentProcessingStep.update({
    where: {
      id: data.stepId,
    },

    data: {
      status: "FAILED",
      completedAt,
      durationMs,
      error: data.error,
      message: data.message ?? "Processing failed",
    },
  });
}

interface SkipProcessingStepInput {
  documentId: string;
  stepName: string;
  message: string;
}

export async function skipProcessingStep(data: SkipProcessingStepInput) {
  return prisma.documentProcessingStep.create({
    data: {
      documentId: data.documentId,
      stepName: data.stepName,
      status: "SKIPPED",
      message: data.message,
    },
  });
}
