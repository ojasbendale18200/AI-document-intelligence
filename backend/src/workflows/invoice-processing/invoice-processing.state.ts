import { Annotation } from "@langchain/langgraph";

export const InvoiceProcessingState = Annotation.Root({
  // The document being processed.
  documentId: Annotation<string>(),

  // Current position in the workflow.
  currentStep: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "STARTED",
  }),

  // Overall workflow status.
  status: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "PROCESSING",
  }),

  // Financial validation result.
  validationPassed: Annotation<boolean | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Purchase-order matching result.
  matchingStatus: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Explanation of errors or review requirements.
  error: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  message: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  // Why the workflow needs human intervention.
  reviewReason: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // The reviewer's decision.
  reviewDecision: Annotation<"APPROVE" | "REJECT" | "CORRECT" | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Optional explanation provided by the reviewer.
  reviewerComment: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});


export type InvoiceProcessingStateType = typeof InvoiceProcessingState.State;
export type InvoiceProcessingUpdateType = typeof InvoiceProcessingState.Update;
