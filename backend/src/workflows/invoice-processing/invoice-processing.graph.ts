import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";

import { InvoiceProcessingState } from "./invoice-processing.state.js";

import {
  extractTextNode,
  extractInvoiceNode,
  validateInvoiceNode,
  matchPurchaseOrderNode,
  humanReviewNode,
  workflowFailureNode,
  completeWorkflowNode,
} from "./invoice-processing.nodes.js";
import { invoiceCheckpointer } from "../../config/langgraph-checkpointer.js";
import { withErrorHandling } from "./invoice-processing.helpers.js";

function routeAfterValidation(state: typeof InvoiceProcessingState.State) {
  if (state.status === "FAILED") {
    return "failure";
  }

  if (state.validationPassed === true) {
    return "matchPO";
  }

  return "humanReview";
}

function routeAfterMatching(state: typeof InvoiceProcessingState.State) {
  if (state.status === "FAILED") {
    return "failure";
  }

  if (state.matchingStatus === "MATCHED") {
    return "complete";
  }

  return "humanReview";
}

export const invoiceProcessingGraph = new StateGraph(InvoiceProcessingState)
  .addNode("extractText", withErrorHandling("PDF extraction", extractTextNode))

  .addNode(
    "extractInvoice",
    withErrorHandling("AI extraction", extractInvoiceNode),
  )
  .addNode(
    "validateInvoice",
    withErrorHandling("Financial validation", validateInvoiceNode),
  )
  .addNode("matchPO", withErrorHandling("PO matching", matchPurchaseOrderNode))
  .addNode("humanReview", humanReviewNode)
  .addNode("failure", workflowFailureNode)
  .addNode("complete", completeWorkflowNode)

  // Normal edges: the next step is predetermined.
  .addEdge(START, "extractText")
  .addEdge("extractText", "extractInvoice")
  .addEdge("extractInvoice", "validateInvoice")

  // Conditional edge: choose the next step based on validation.
  .addConditionalEdges("validateInvoice", routeAfterValidation, {
    matchPO: "matchPO",
    humanReview: "humanReview",
    failure: "failure",
  })

  // Conditional edge: choose the next step based on PO matching.
  .addConditionalEdges("matchPO", routeAfterMatching, {
    complete: "complete",
    humanReview: "humanReview",
    failure: "failure",
  })

  .addEdge("humanReview", END)
  .addEdge("failure", END)
  .addEdge("complete", END)

  .compile({ checkpointer: invoiceCheckpointer });
