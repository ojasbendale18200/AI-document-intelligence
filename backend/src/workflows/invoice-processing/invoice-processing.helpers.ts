import { InvoiceProcessingStateType } from "./invoice-processing.state.js";

type WorkflowNode = (
  state: InvoiceProcessingStateType
) => Promise<Partial<InvoiceProcessingStateType>>;

export function withErrorHandling(
  nodeName: string,
  node: WorkflowNode
): WorkflowNode {
  return async (state) => {
    try {
      return await node(state);
    } catch (error) {
      console.error(
        `[Workflow] ${nodeName} failed:`,
        error
      );

      return {
        currentStep: "FAILED",
        status: "FAILED",
        error: `${nodeName} failed.`,
        message: "Invoice processing could not be completed.",
      };
    }
  };
}