export interface ProcessingStep {
  id: string;
  documentId: string;
  stepName: string;
  status: string; // PENDING | PROCESSING | COMPLETED | FAILED | SKIPPED
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  message: string | null;
  error: string | null;
  attempt: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingHistoryResponse {
  documentId: string;
  currentStatus: string;
  count: number;
  steps: ProcessingStep[];
}
