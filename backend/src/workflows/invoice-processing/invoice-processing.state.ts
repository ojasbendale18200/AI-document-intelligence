import { Annotation } from "@langchain/langgraph";

export const InvoiceProcessingState = Annotation.Root({
  // ID of the uploaded document being processed.
  documentId: Annotation<string>(),

  // Tracks the workflow's current processing stage.
  currentStep: Annotation<string>({
    reducer: (_previous, next) => next,
    default: () => "STARTED",
  }),

  // Tracks the overall processing outcome.
  status: Annotation<string>({
    reducer: (_previous, next) => next,
    default: () => "PROCESSING",
  }),

  // Stores the error message when a node fails.
  error: Annotation<string | null>({
    reducer: (_previous, next) => next,
    default: () => null,
  }),

  // Stores a human-readable explanation of the outcome.
  message: Annotation<string>({
    reducer: (_previous, next) => next,
    default: () => "",
  }),
});

export type InvoiceProcessingStateType = typeof InvoiceProcessingState.State;
export type InvoiceProcessingUpdateType = typeof InvoiceProcessingState.Update;

