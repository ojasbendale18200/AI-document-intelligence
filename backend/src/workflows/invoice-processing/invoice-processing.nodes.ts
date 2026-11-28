import prisma from "../../config/prisma.js";

import { extractDocumentText } from "../../services/pdf-extraction.service.js";
import { extractInvoiceData } from "../../services/invoice-extraction.service.js";

import { runInvoiceValidation } from "../../services/invoice-validation-runner.service.js";

import { matchInvoiceToPurchaseOrder } from "../../services/purchase-order-matching.service.js";
import { InvoiceProcessingStateType } from "./invoice-processing.state.js";

import { createOrUpdateReviewTask } from "../../services/review-task.service.js";

import {
  startProcessingStep,
  completeProcessingStep,
  failProcessingStep,
  skipProcessingStep,
} from "../../services/processing-history.service.js";

import { interrupt } from "@langchain/langgraph";

type ReviewResponse = {
  decision: "APPROVE" | "REJECT" | "CORRECT";
  comment?: string;
};

/**
 * Node 1: extractText
 * Extract text from the uploaded PDF.
 */
export async function extractTextNode(state: InvoiceProcessingStateType) {
  console.log(`[Workflow] Extracting PDF text: ${state.documentId}`);

  const step = await startProcessingStep({
    documentId: state.documentId,
    stepName: "extractText",
    message: "Extracting text from PDF document.",
  });

  try {
    await extractDocumentText(state.documentId);

    await completeProcessingStep({
      stepId: step.id,
      message: "PDF text extraction completed successfully.",
    });

    return {
      currentStep: "TEXT_EXTRACTED",
      status: "PROCESSING",
      error: null,
      message: "PDF text extraction completed.",
    };
  } catch (error) {
    await failProcessingStep({
      stepId: step.id,
      error: error instanceof Error ? error.message : String(error),
      message: "PDF text extraction failed.",
    });
    throw error;
  }
}

/**
 * Node 2: extractInvoice
 * Extract structured invoice fields using the AI service.
 */
export async function extractInvoiceNode(state: InvoiceProcessingStateType) {
  console.log(`[Workflow] Extracting invoice data: ${state.documentId}`);

  const step = await startProcessingStep({
    documentId: state.documentId,
    stepName: "extractInvoice",
    message: "Extracting structured invoice data using AI.",
  });

  try {
    await extractInvoiceData(state.documentId);

    await completeProcessingStep({
      stepId: step.id,
      message: "AI invoice extraction completed successfully.",
    });

    return {
      currentStep: "AI_EXTRACTION_COMPLETED",
      status: "PROCESSING",
      error: null,
      message: "AI invoice extraction completed.",
    };
  } catch (error) {
    await failProcessingStep({
      stepId: step.id,
      error: error instanceof Error ? error.message : String(error),
      message: "AI invoice extraction failed.",
    });
    throw error;
  }
}

/**
 * Node 3: validateInvoice
 * Run financial validation and read the persisted result.
 */
export async function validateInvoiceNode(state: InvoiceProcessingStateType) {
  console.log(`[Workflow] Validating invoice: ${state.documentId}`);

  const step = await startProcessingStep({
    documentId: state.documentId,
    stepName: "validateInvoice",
    message: "Running financial validation.",
  });

  try {
    await runInvoiceValidation(state.documentId);

    const invoice = await prisma.invoice.findUnique({
      where: {
        documentId: state.documentId,
      },
      select: {
        validationPassed: true,
        validationDecision: true,
      },
    });

    if (!invoice || invoice.validationPassed === null) {
      throw new Error("Financial validation did not produce a saved result.");
    }

    const passed = invoice.validationPassed;
    const message = passed
      ? "Financial validation passed."
      : `Financial validation requires review: ${
          invoice.validationDecision ?? "REVIEW_REQUIRED"
        }`;

    await completeProcessingStep({
      stepId: step.id,
      message,
    });

    // If financial validation failed, matchPO is skipped for human review
    if (!passed) {
      await skipProcessingStep({
        documentId: state.documentId,
        stepName: "matchPO",
        message: "Skipped because financial validation requires review.",
      });
    }

    return {
      currentStep: "FINANCIAL_VALIDATION_COMPLETED",
      validationPassed: passed,
      status: passed ? "PROCESSING" : "REVIEW_REQUIRED",
      error: null,
      message,
    };
  } catch (error) {
    await failProcessingStep({
      stepId: step.id,
      error: error instanceof Error ? error.message : String(error),
      message: "Financial validation failed.",
    });
    throw error;
  }
}

/**
 * Node 4: matchPO
 * Match the invoice against its purchase order.
 */
export async function matchPurchaseOrderNode(
  state: InvoiceProcessingStateType,
) {
  console.log(`[Workflow] Matching purchase order: ${state.documentId}`);

  const step = await startProcessingStep({
    documentId: state.documentId,
    stepName: "matchPO",
    message: "Matching invoice against purchase order.",
  });

  try {
    await matchInvoiceToPurchaseOrder(state.documentId);

    const invoice = await prisma.invoice.findUnique({
      where: {
        documentId: state.documentId,
      },
      select: {
        purchaseOrderMatch: {
          select: {
            status: true,
          },
        },
      },
    });

    const matchingStatus = invoice?.purchaseOrderMatch?.status ?? null;

    if (!matchingStatus) {
      throw new Error("Purchase order matching did not produce a saved result.");
    }

    const matched = matchingStatus === "MATCHED";
    const message = matched
      ? "Invoice successfully matched against the purchase order."
      : "Purchase order matching found discrepancies.";

    await completeProcessingStep({
      stepId: step.id,
      message,
    });

    return {
      currentStep: "PO_MATCHING_COMPLETED",
      matchingStatus,
      status: matched ? "COMPLETED" : "REVIEW_REQUIRED",
      error: null,
      message,
    };
  } catch (error) {
    await failProcessingStep({
      stepId: step.id,
      error: error instanceof Error ? error.message : String(error),
      message: "Purchase order matching failed.",
    });
    throw error;
  }
}

/**
 * Node 5: humanReview
 * Route the invoice to human review.
 */
export async function humanReviewNode(state: InvoiceProcessingStateType) {
  const threadId = `invoice-${state.documentId}`;

  const reason =
    state.reviewReason ??
    state.message ??
    "This invoice requires manual review.";

  const reasonCode =
    state.validationPassed === false
      ? "FINANCIAL_VALIDATION"
      : state.matchingStatus === "MISMATCH"
        ? "PO_MATCHING"
        : "MANUAL_REVIEW";

  // 1. Create or update the persistent review task before pausing.
  await createOrUpdateReviewTask({
    documentId: state.documentId,
    threadId,
    reasonCode,
    reason,
    details: {
      validationPassed: state.validationPassed,
      matchingStatus: state.matchingStatus,
      currentStep: state.currentStep,
    },
  });

  // Check if a processing step for humanReview is already open in PROCESSING status
  const existingStep = await prisma.documentProcessingStep.findFirst({
    where: {
      documentId: state.documentId,
      stepName: "humanReview",
      status: "PROCESSING",
    },
    orderBy: { createdAt: "desc" },
  });

  const reviewStep =
    existingStep ??
    (await startProcessingStep({
      documentId: state.documentId,
      stepName: "humanReview",
      message: `Awaiting human review: ${reason}`,
    }));

  // 2. Pause the workflow and wait for a decision.
  const reviewResponse = interrupt({
    type: "INVOICE_REVIEW_REQUIRED",
    documentId: state.documentId,
    reason,
    reasonCode,
    validationPassed: state.validationPassed,
    matchingStatus: state.matchingStatus,
  }) as ReviewResponse;

  // 3. Mark the human review step as completed when the workflow resumes.
  await completeProcessingStep({
    stepId: reviewStep.id,
    message: `Reviewer decision: ${reviewResponse.decision}${
      reviewResponse.comment ? ` - ${reviewResponse.comment}` : ""
    }`,
  });

  // 4. Continue executing when the workflow is resumed.
  return {
    currentStep: "HUMAN_REVIEW_COMPLETED",
    reviewDecision: reviewResponse.decision,
    reviewerComment: reviewResponse.comment ?? null,

    status:
      reviewResponse.decision === "APPROVE"
        ? "HUMAN_APPROVED"
        : reviewResponse.decision === "REJECT"
          ? "REJECTED"
          : "CORRECTION_REQUIRED",

    message: `Reviewer decision: ${reviewResponse.decision}`,
  };
}

/**
 * Node 6: failure
 * Record an unexpected workflow failure.
 */
export async function workflowFailureNode(state: InvoiceProcessingStateType) {
  console.error(
    `[Workflow] Processing failed for ${state.documentId}:`,
    state.error,
  );

  const step = await startProcessingStep({
    documentId: state.documentId,
    stepName: "failure",
    message: "Recording workflow failure.",
  });

  await failProcessingStep({
    stepId: step.id,
    error: state.error ?? "Workflow processing failure",
    message: state.message || "Invoice processing failed.",
  });

  return {
    currentStep: "FAILED",
    status: "FAILED",
    message: "Invoice processing failed.",
  };
}

/**
 * Node 7: complete
 * Mark the workflow as successfully completed.
 */
export async function completeWorkflowNode(state: InvoiceProcessingStateType) {
  console.log(`[Workflow] Processing completed for ${state.documentId}`);

  const step = await startProcessingStep({
    documentId: state.documentId,
    stepName: "complete",
    message: "Finalizing workflow completion.",
  });

  await completeProcessingStep({
    stepId: step.id,
    message:
      "Invoice extraction, financial validation, and PO matching completed successfully.",
  });

  return {
    currentStep: "COMPLETED",
    status: "COMPLETED",
    error: null,
    message:
      "Invoice extraction, financial validation, and PO matching completed successfully.",
  };
}
