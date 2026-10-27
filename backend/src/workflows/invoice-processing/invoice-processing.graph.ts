import { StateGraph, START, END } from "@langchain/langgraph";

import { InvoiceProcessingState } from "./invoice-processing.state.js";

import { startProcessingNode } from "./invoice-processing.nodes.js";

export const invoiceProcessingGraph = new StateGraph(InvoiceProcessingState)
  .addNode("startProcessing", startProcessingNode)

  .addEdge(START, "startProcessing")

  .addEdge("startProcessing", END)

  .compile();
