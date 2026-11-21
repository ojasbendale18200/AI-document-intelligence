export type ReviewStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";

export type ReviewDecision = "APPROVE" | "REJECT" | "CORRECT";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ValidationIssue {
  code: string;
  severity: "ERROR" | "WARNING";
  field?: string;
  message: string;
  expected?: number | null;
  actual?: number | null;
}

export interface ReviewInvoice {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplierName: string | null;
  currency: string | null;
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  purchaseOrderNumber: string | null;
  lineItems: InvoiceLineItem[] | null;
  validationIssues: ValidationIssue[] | null;
  validationPassed: boolean | null;
}

export interface ReviewCountsResponse {
  PENDING: number;
  IN_PROGRESS: number;
  RESOLVED: number;
}

export interface ReviewDocument {
  id: string;
  filename: string;
  status: string;
  invoice: ReviewInvoice | null;
}

export interface ReviewTask {
  id: string;
  documentId: string;
  threadId: string;
  status: ReviewStatus;
  reasonCode: string;
  reason: string;
  decision: ReviewDecision | null;
  reviewerComment: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  document: ReviewDocument;
}

export interface ReviewQueueResponse {
  count: number;
  tasks: ReviewTask[];
}

export interface ReviewDecisionPayload {
  decision: ReviewDecision;
  comment?: string;
}
