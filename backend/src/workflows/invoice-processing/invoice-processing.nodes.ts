import prisma from "../../config/prisma.js";

import { extractDocumentText } from "../../services/pdf-extraction.service.js";
import { extractInvoiceData } from "../../services/invoice-extraction.service.js";

import { runInvoiceValidation } from "../../services/invoice-validation-runner.service.js";

import { matchInvoiceToPurchaseOrder } from "../../services/purchase-order-matching.service.js";
import { InvoiceProcessingStateType } from "./invoice-processing.state.js";

import { interrupt } from "@langchain/langgraph";

type ReviewResponse = {
  decision: "APPROVE" | "REJECT" | "CORRECT";
  comment?: string;
};

/**

* Node 1:
* Extract text from the uploaded PDF.
  */
export async function extractTextNode(state: InvoiceProcessingStateType) {
  console.log(`[Workflow] Extracting PDF text: ${state.documentId}`);

  await extractDocumentText(state.documentId);

  return {
    currentStep: "TEXT_EXTRACTED",
    status: "PROCESSING",
    error: null,
    message: "PDF text extraction completed.",
  };
}

/**

* Node 2:
* Extract structured invoice fields using the existing AI service.
  */
export async function extractInvoiceNode(state: InvoiceProcessingStateType) {
  console.log(`[Workflow] Extracting invoice data: ${state.documentId}`);

  await extractInvoiceData(state.documentId);

  return {
    currentStep: "AI_EXTRACTION_COMPLETED",
    status: "PROCESSING",
    error: null,
    message: "AI invoice extraction completed.",
  };
}

/**

* Node 3:
* Run financial validation and read the persisted result.
  */
export async function validateInvoiceNode(state: InvoiceProcessingStateType) {
  console.log(`[Workflow] Validating invoice: ${state.documentId}`);

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

  return {
    currentStep: "FINANCIAL_VALIDATION_COMPLETED",
    validationPassed: passed,
    status: passed ? "PROCESSING" : "REVIEW_REQUIRED",
    error: null,
    message: passed
      ? "Financial validation passed."
      : `Financial validation requires review: ${
          invoice.validationDecision ?? "REVIEW_REQUIRED"
        }`,
  };
}

/**

* Node 4:
* Match the invoice against its purchase order.
  */
export async function matchPurchaseOrderNode(
  state: InvoiceProcessingStateType,
) {
  console.log(`[Workflow] Matching purchase order: ${state.documentId}`);

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

  return {
    currentStep: "PO_MATCHING_COMPLETED",
    matchingStatus,
    status: matched ? "COMPLETED" : "REVIEW_REQUIRED",
    error: null,
    message: matched
      ? "Invoice successfully matched against the purchase order."
      : "Purchase order matching found discrepancies.",
  };
}

/**

* Node 5:
* Route the invoice to human review.
  */
export async function humanReviewNode(state: InvoiceProcessingStateType) {
  // Pause the workflow and request a human decision.
  const reviewResponse = interrupt({
    type: "INVOICE_REVIEW_REQUIRED",
    documentId: state.documentId,
    reason:
      state.reviewReason ??
      state.message ??
      "This invoice requires manual review.",
    validationPassed: state.validationPassed,
    matchingStatus: state.matchingStatus,
    instructions: [
      "APPROVE: Approve the invoice after reviewing the evidence.",
      "REJECT: Reject the invoice.",
      "CORRECT: Send the invoice for correction and reprocessing.",
    ],
  }) as ReviewResponse;

  // This code runs after the workflow is resumed.
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

* Node 6:
* Record an unexpected workflow failure.
  */
export async function workflowFailureNode(state: InvoiceProcessingStateType) {
  console.error(
    `[Workflow] Processing failed for ${state.documentId}:`,
    state.error,
  );

  return {
    currentStep: "FAILED",
    status: "FAILED",
    message: "Invoice processing failed.",
  };
}

/**

* Final node:
* Mark the workflow as successfully completed.
  */
export async function completeWorkflowNode(state: InvoiceProcessingStateType) {
  console.log(`[Workflow] Processing completed for ${state.documentId}`);

  return {
    currentStep: "COMPLETED",
    status: "COMPLETED",
    error: null,
    message:
      "Invoice extraction, financial validation, and PO matching completed successfully.",
  };
}
