"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import InvoicePdfViewer from "@/src/components/reviews/InvoicePdfViewer";
import FinancialDiscrepancy from "@/src/components/reviews/FinancialDiscrepancy";
import FinancialSummary from "@/src/components/reviews/FinancialSummary";
import ReviewStatusBadge from "@/src/components/reviews/ReviewStatusBadge";
import ReviewDecisionPanel from "@/src/components/reviews/ReviewDecisionPanel";

import { getReviewById } from "@/src/lib/api/reviews";

import type {
  ReviewTask,
  InvoiceLineItem,
  ValidationIssue,
} from "@/src/types/review";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

/* ── Helpers ───────────────────────────────── */

function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null) return "Not available";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Not available";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Steps ─────────────────────────────────── */

type Step = 1 | 2 | 3;

const STEPS = [
  { number: 1 as Step, label: "Review Details" },
  { number: 2 as Step, label: "Make Changes" },
  { number: 3 as Step, label: "Re-validate & Submit" },
];

/* ── Main Content ──────────────────────────── */

function ReviewDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reviewTaskId = params.id;

  const [task, setTask] = useState<ReviewTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current wizard step
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Editable form state
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editPONumber, setEditPONumber] = useState("");
  const [editCurrency, setEditCurrency] = useState("INR");
  const [editSubtotal, setEditSubtotal] = useState<number | null>(null);
  const [editTaxAmount, setEditTaxAmount] = useState<number | null>(null);
  const [editTotalAmount, setEditTotalAmount] = useState<number | null>(null);
  const [editLineItems, setEditLineItems] = useState<InvoiceLineItem[]>([]);

  const loadTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getReviewById(reviewTaskId);
      setTask(result);

      // Populate editable fields
      const inv = result.document.invoice;
      if (inv) {
        setEditInvoiceNumber(inv.invoiceNumber ?? "");
        setEditInvoiceDate(inv.invoiceDate ?? "");
        setEditSupplierName(inv.supplierName ?? "");
        setEditPONumber(inv.purchaseOrderNumber ?? "");
        setEditCurrency(inv.currency ?? "INR");
        setEditSubtotal(inv.subtotal);
        setEditTaxAmount(inv.taxAmount);
        setEditTotalAmount(inv.totalAmount);
        setEditLineItems(
          Array.isArray(inv.lineItems) ? [...inv.lineItems] : [],
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load review task.",
      );
    } finally {
      setLoading(false);
    }
  }, [reviewTaskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  /* ── Loading / Error states ──────────────── */

  if (loading) {
    return <div className="loading-state">Loading invoice details...</div>;
  }

  if (error || !task) {
    return (
      <div>
        <div className="error-alert">
          {error ?? "Review task not found."}
        </div>
        <button
          className="detail-back"
          onClick={() => router.push("/reviews")}
        >
          ← Back to Reviews
        </button>
      </div>
    );
  }

  const invoice = task.document.invoice;
  const isPending = task.status === "PENDING";
  const details = task.details;

  // Validation preview calculations (live)
  const liveExpectedTotal =
    editSubtotal !== null && editTaxAmount !== null
      ? editSubtotal + editTaxAmount
      : null;

  const liveDifference =
    editTotalAmount !== null && liveExpectedTotal !== null
      ? Math.abs(editTotalAmount - liveExpectedTotal)
      : null;

  const isConsistent =
    liveDifference !== null && liveDifference < 0.01;

  // Parse validation issues from invoice
  const validationIssues: ValidationIssue[] = Array.isArray(
    invoice?.validationIssues,
  )
    ? (invoice!.validationIssues as ValidationIssue[])
    : [];

  /* ── Line item helpers ───────────────────── */

  function updateLineItem(
    index: number,
    field: keyof InvoiceLineItem,
    value: string | number,
  ) {
    setEditLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "description") {
        item.description = value as string;
      } else {
        item[field] = Number(value) || 0;
      }

      // Recalculate amount
      if (field === "quantity" || field === "unitPrice") {
        item.amount = item.quantity * item.unitPrice;
      }

      updated[index] = item;
      return updated;
    });
  }

  function addLineItem() {
    setEditLineItems((prev) => [
      ...prev,
      { description: "", quantity: 0, unitPrice: 0, amount: 0 },
    ]);
  }

  function removeLineItem(index: number) {
    setEditLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function discardChanges() {
    if (!invoice) return;
    setEditInvoiceNumber(invoice.invoiceNumber ?? "");
    setEditInvoiceDate(invoice.invoiceDate ?? "");
    setEditSupplierName(invoice.supplierName ?? "");
    setEditPONumber(invoice.purchaseOrderNumber ?? "");
    setEditCurrency(invoice.currency ?? "INR");
    setEditSubtotal(invoice.subtotal);
    setEditTaxAmount(invoice.taxAmount);
    setEditTotalAmount(invoice.totalAmount);
    setEditLineItems(
      Array.isArray(invoice.lineItems) ? [...invoice.lineItems] : [],
    );
  }

  /* ── Render ──────────────────────────────── */

  return (
    <>
      {/* Breadcrumb */}
      <div className="review-breadcrumb">
        <span>Reviews</span>
        <span className="review-breadcrumb-sep">›</span>
        <span>{invoice?.invoiceNumber ?? "Invoice"}</span>
        <span className="review-breadcrumb-sep">›</span>
        <span className="review-breadcrumb-active">
          {currentStep === 1
            ? "Review Details"
            : currentStep === 2
              ? "Make Changes"
              : "Re-validate & Submit"}
        </span>
      </div>

      {/* Page Title */}
      <div className="review-page-title">
        <h1>
          {currentStep === 1
            ? "📋 Review Details"
            : currentStep === 2
              ? "⚙️ Make Changes"
              : "✅ Re-validate & Submit"}
        </h1>
        <p className="review-page-subtitle">
          {currentStep === 1
            ? "Review the extracted invoice information and decide on the next action."
            : currentStep === 2
              ? "Review and correct the extracted invoice information. Changes will be saved and the invoice will be re-validated."
              : "Final validation check before submitting your decision."}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="step-indicator">
        {STEPS.map((step, i) => (
          <div key={step.number} className="step-indicator-item">
            <button
              type="button"
              onClick={() => setCurrentStep(step.number)}
              className={`step-indicator-circle ${
                step.number < currentStep
                  ? "step-indicator-circle--done"
                  : step.number === currentStep
                    ? "step-indicator-circle--active"
                    : "step-indicator-circle--upcoming"
              }`}
            >
              {step.number < currentStep ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                step.number
              )}
            </button>

            <span
              className={`step-indicator-label ${
                step.number === currentStep
                  ? "step-indicator-label--active"
                  : ""
              }`}
            >
              {step.label}
            </span>

            {i < STEPS.length - 1 && (
              <div
                className={`step-indicator-line ${
                  step.number < currentStep
                    ? "step-indicator-line--done"
                    : ""
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Info Cards Row */}
      <div className="detail-info-cards detail-info-cards--4">
        {/* Invoice Number */}
        <div className="detail-info-card">
          <div className="detail-info-card-icon detail-info-card-icon--money">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <div className="detail-info-card-value" style={{ fontSize: 16 }}>
              {invoice?.invoiceNumber ?? "N/A"}
            </div>
            <div className="detail-info-card-label">
              {invoice?.supplierName ?? "Unknown Supplier"}
            </div>
          </div>
        </div>

        {/* PO Number */}
        <div className="detail-info-card">
          <div className="detail-info-card-icon detail-info-card-icon--po">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div>
            <div className="detail-info-card-label">PO Number</div>
            <div className="detail-info-card-value">
              {invoice?.purchaseOrderNumber ?? "N/A"}
            </div>
          </div>
        </div>

        {/* Invoice Date */}
        <div className="detail-info-card">
          <div className="detail-info-card-icon detail-info-card-icon--date">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div className="detail-info-card-label">Invoice Date</div>
            <div className="detail-info-card-value">
              {formatDate(invoice?.invoiceDate ?? null)}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="detail-info-card detail-info-card--status">
          <div className="detail-info-card-icon detail-info-card-icon--status">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <div className="detail-info-card-label">STATUS</div>
            <ReviewStatusBadge status={task.status} />
          </div>
        </div>
      </div>

      {/* ─── STEP 1: Review Details ──────────── */}
      {currentStep === 1 && (
        <>
          <FinancialSummary
            subtotal={invoice?.subtotal ?? null}
            taxAmount={invoice?.taxAmount ?? null}
            totalAmount={invoice?.totalAmount ?? null}
            currency={invoice?.currency}
          />

          <div className="detail-body" style={{ marginTop: 20 }}>
            {/* Left Column */}
            <div>
              {/* Reason for Review */}
              <div className="reason-alert">
                <div className="reason-alert-icon">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <h3>Reason for Review</h3>
                  <p>{task.reason}</p>
                </div>
              </div>

              {/* Financial Information */}
              <div className="financial-section">
                <h2>Financial Information</h2>
                <p className="financial-subtitle">
                  (Extracted from Invoice)
                </p>

                <div className="financial-row">
                  <span className="financial-row-label">Subtotal</span>
                  <span className="financial-row-value">
                    {formatMoney(
                      invoice?.subtotal ?? null,
                      invoice?.currency ?? null,
                    )}
                  </span>
                </div>

                <div className="financial-row">
                  <span className="financial-row-label">Tax (GST)</span>
                  <span className="financial-row-value">
                    {formatMoney(
                      invoice?.taxAmount ?? null,
                      invoice?.currency ?? null,
                    )}
                  </span>
                </div>

                <div className="financial-row financial-row--total">
                  <span className="financial-row-label">Total (Invoice)</span>
                  <span className="financial-row-value">
                    {formatMoney(
                      invoice?.totalAmount ?? null,
                      invoice?.currency ?? null,
                    )}
                  </span>
                </div>
              </div>

              {/* Financial Discrepancy */}
              <FinancialDiscrepancy
                subtotal={invoice?.subtotal ?? null}
                taxAmount={invoice?.taxAmount ?? null}
                totalAmount={invoice?.totalAmount ?? null}
                validationIssues={validationIssues}
              />
            </div>

            {/* Middle Column — Invoice PDF */}
            <div>
              <InvoicePdfViewer documentId={task.documentId} />
            </div>

            {/* Right Column — Decision Panel */}
            <div>
              {task.status === "RESOLVED" && (
                <div className="previous-decision" style={{ marginBottom: 20 }}>
                  <h2>Previous Decision</h2>
                  <p>
                    <strong>Decision:</strong>{" "}
                    {task.decision ?? "Not available"}
                  </p>
                  <p>{task.reviewerComment ?? "No comment provided."}</p>
                </div>
              )}

              {isPending ? (
                <ReviewDecisionPanel
                  reviewTaskId={task.id}
                  onSuccess={() => router.push("/reviews")}
                />
              ) : task.status !== "RESOLVED" ? (
                <div className="previous-decision">
                  <h2>No decision available</h2>
                  <p>
                    This task is not pending. Refresh the review queue to see
                    the latest status.
                  </p>
                </div>
              ) : null}

              {/* Button to go to Make Changes */}
              {isPending && (
                <button
                  type="button"
                  className="make-changes-btn"
                  onClick={() => setCurrentStep(2)}
                  style={{ marginTop: 16 }}
                >
                  ✏️ Make Changes Instead
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── STEP 2: Make Changes ────────────── */}
      {currentStep === 2 && (
        <div className="make-changes-layout">
          {/* Left: Editable Form */}
          <div className="editable-form-panel">
            <div className="editable-form-header">
              <div className="editable-form-header-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <h2 className="editable-form-title">
                  Extracted Invoice Information{" "}
                  <span className="editable-form-tag">(Editable)</span>
                </h2>
                <p className="editable-form-subtitle">
                  Update any incorrect information below.
                </p>
              </div>
            </div>

            {/* Form fields */}
            <div className="editable-form-grid">
              <div className="editable-form-field">
                <label>
                  Invoice Number <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  value={editInvoiceNumber}
                  onChange={(e) => setEditInvoiceNumber(e.target.value)}
                />
              </div>

              <div className="editable-form-field">
                <label>
                  Invoice Date <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  value={editInvoiceDate}
                  onChange={(e) => setEditInvoiceDate(e.target.value)}
                  placeholder="Jan 20, 2026"
                />
              </div>
            </div>

            <div className="editable-form-grid editable-form-grid--single">
              <div className="editable-form-field">
                <label>
                  Supplier Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  value={editSupplierName}
                  onChange={(e) => setEditSupplierName(e.target.value)}
                />
              </div>
            </div>

            <div className="editable-form-grid">
              <div className="editable-form-field">
                <label>Purchase Order Number</label>
                <input
                  type="text"
                  value={editPONumber}
                  onChange={(e) => setEditPONumber(e.target.value)}
                />
              </div>

              <div className="editable-form-field">
                <label>
                  Currency <span className="required-star">*</span>
                </label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="editable-form-grid editable-form-grid--3">
              <div className="editable-form-field">
                <label>
                  Subtotal <span className="required-star">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editSubtotal ?? ""}
                  onChange={(e) =>
                    setEditSubtotal(
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </div>

              <div className="editable-form-field">
                <label>
                  Tax (GST) <span className="required-star">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editTaxAmount ?? ""}
                  onChange={(e) =>
                    setEditTaxAmount(
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </div>

              <div className="editable-form-field">
                <label>
                  Total Amount <span className="required-star">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editTotalAmount ?? ""}
                  onChange={(e) =>
                    setEditTotalAmount(
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  className={
                    liveDifference !== null && liveDifference > 0.01
                      ? "input--highlight-blue"
                      : ""
                  }
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="line-items-section">
              <div className="line-items-header">
                <h3>Line Items ({editLineItems.length})</h3>
                <button
                  type="button"
                  className="add-line-item-btn"
                  onClick={addLineItem}
                >
                  + Add Line Item
                </button>
              </div>

              <table className="line-items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {editLineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="line-item-num">{idx + 1}</td>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>
                        {formatMoney(item.unitPrice, editCurrency)}
                      </td>
                      <td>
                        {formatMoney(item.amount, editCurrency)}
                      </td>
                      <td className="line-item-actions">
                        <button
                          type="button"
                          className="line-item-edit-btn"
                          title="Edit"
                          onClick={() => {
                            const desc = prompt(
                              "Description:",
                              item.description,
                            );
                            if (desc !== null)
                              updateLineItem(idx, "description", desc);
                            const qty = prompt(
                              "Quantity:",
                              String(item.quantity),
                            );
                            if (qty !== null)
                              updateLineItem(idx, "quantity", Number(qty));
                            const price = prompt(
                              "Unit Price:",
                              String(item.unitPrice),
                            );
                            if (price !== null)
                              updateLineItem(
                                idx,
                                "unitPrice",
                                Number(price),
                              );
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="line-item-delete-btn"
                          title="Delete"
                          onClick={() => removeLineItem(idx)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {editLineItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="line-items-empty">
                        No line items. Click &quot;+ Add Line Item&quot; to add
                        one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: PDF Viewer + Validation Preview */}
          <div className="make-changes-right">
            <InvoicePdfViewer documentId={task.documentId} />

            {/* Validation Preview */}
            <div className="validation-preview">
              <h3 className="validation-preview-title">Validation Preview</h3>

              {isConsistent ? (
                <div className="validation-preview-status validation-preview-status--ok">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>The updated amounts are consistent.</span>
                </div>
              ) : (
                <div className="validation-preview-status validation-preview-status--warn">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>The amounts have a discrepancy.</span>
                </div>
              )}

              <div className="validation-preview-rows">
                <div className="validation-preview-row">
                  <span>Subtotal + Tax (Expected Total)</span>
                  <span className="validation-preview-value">
                    {formatMoney(liveExpectedTotal, editCurrency)}
                  </span>
                </div>
                <div className="validation-preview-row">
                  <span>Total Amount (Updated)</span>
                  <span className="validation-preview-value">
                    {formatMoney(editTotalAmount, editCurrency)}
                  </span>
                </div>
                <div className="validation-preview-row validation-preview-row--diff">
                  <span>Difference</span>
                  <span className="validation-preview-value">
                    {formatMoney(liveDifference ?? 0, editCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Re-validate & Submit ────── */}
      {currentStep === 3 && (
        <div className="detail-body">
          {/* Left: Updated summary */}
          <div>
            <FinancialSummary
              subtotal={editSubtotal}
              taxAmount={editTaxAmount}
              totalAmount={editTotalAmount}
              currency={editCurrency}
            />

            <div style={{ marginTop: 20 }}>
              <FinancialDiscrepancy
                subtotal={editSubtotal}
                taxAmount={editTaxAmount}
                totalAmount={editTotalAmount}
                validationIssues={validationIssues}
              />
            </div>
          </div>

          {/* Middle: PDF */}
          <div>
            <InvoicePdfViewer documentId={task.documentId} />
          </div>

          {/* Right: Decision */}
          <div>
            {isPending ? (
              <ReviewDecisionPanel
                reviewTaskId={task.id}
                onSuccess={() => router.push("/reviews")}
              />
            ) : (
              <div className="previous-decision">
                <h2>Review Complete</h2>
                <p>Decision: {task.decision ?? "N/A"}</p>
                <p>{task.reviewerComment ?? "No comment."}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Bottom Action Bar ───────────────── */}
      <div className="review-action-bar">
        <button
          type="button"
          className="review-action-btn review-action-btn--back"
          onClick={() => {
            if (currentStep === 1) {
              router.push("/reviews");
            } else {
              setCurrentStep((prev) => (prev - 1) as Step);
            }
          }}
        >
          ← {currentStep === 1 ? "Back to Review" : "Back"}
        </button>

        <div className="review-action-bar-right">
          {currentStep === 2 && (
            <button
              type="button"
              className="review-action-btn review-action-btn--discard"
              onClick={discardChanges}
            >
              Discard Changes
            </button>
          )}

          {currentStep < 3 && (
            <button
              type="button"
              className="review-action-btn review-action-btn--primary"
              onClick={() => setCurrentStep((prev) => (prev + 1) as Step)}
            >
              {currentStep === 2 ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Save Changes & Re-validate
                </>
              ) : (
                "Next →"
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function ReviewDetailsPage() {
  return (
    <Suspense
      fallback={<div className="loading-state">Loading review details...</div>}
    >
      <ReviewDetailsContent />
    </Suspense>
  );
}
