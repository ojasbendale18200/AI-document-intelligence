import {
  InvoiceProcessingState,
  type InvoiceProcessingStateType,
} from "./invoice-processing.state.js";

export async function startProcessingNode(state: InvoiceProcessingStateType) {
  console.log(`Starting invoice processing for document: ${state.documentId}`);

  return {
    currentStep: "STARTED",
    status: "PROCESSING",
    error: null,
    message: "Invoice processing has started.",
  };
}
