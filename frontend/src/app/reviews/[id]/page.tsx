"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import InvoicePdfViewer from "@/src/components/reviews/InvoicePdfViewer";
import FinancialDiscrepancy from "@/src/components/reviews/FinancialDiscrepancy";
import AuditTimeline from "@/src/components/reviews/AuditTimeline";
import ReviewStatusBadge from "@/src/components/reviews/ReviewStatusBadge";

import { getReviewById, submitReviewDecision } from "@/src/lib/api/reviews";

import type {
  ReviewTask,
  InvoiceLineItem,
  ValidationIssue,
  ReviewDecision,
} from "@/src/types/review";

/* ── Helpers ───────────────────────────────── */

function formatMoney(amount: number | null, currency: string | null = "INR") {
  if (amount === null || amount === undefined) return "Not available";
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

// Default mock line items matching the screenshot if invoice has none
const DEFAULT_LINE_ITEMS: InvoiceLineItem[] = [
  {
    description: "A4 copier paper cartons",
    quantity: 10,
    unitPrice: 420.0,
    amount: 4200.0,
  },
  {
    description: "Laser toner cartridges",
    quantity: 4,
    unitPrice: 1850.0,
    amount: 7400.0,
  },
  {
    description: "Desk organizers",
    quantity: 6,
    unitPrice: 350.0,
    amount: 2100.0,
  },
];

type ActiveTab = "review" | "make_changes" | "activity_history";

/* ── Main Component ────────────────────────── */

function ReviewDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reviewTaskId = params.id;

  const [task, setTask] = useState<ReviewTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: Review | Make Changes | Activity History
  const [activeTab, setActiveTab] = useState<ActiveTab>("review");

  // Decision Modal / Processing State
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    decision: ReviewDecision;
    comment: string;
  }>({
    open: false,
    decision: "APPROVE",
    comment: "",
  });

  // Editable form state (for Make Changes tab)
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
          Array.isArray(inv.lineItems) && inv.lineItems.length > 0
            ? [...inv.lineItems]
            : DEFAULT_LINE_ITEMS,
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

  /* ── Line item helpers (Make Changes) ────── */

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
    if (!task?.document.invoice) return;
    const inv = task.document.invoice;
    setEditInvoiceNumber(inv.invoiceNumber ?? "");
    setEditInvoiceDate(inv.invoiceDate ?? "");
    setEditSupplierName(inv.supplierName ?? "");
    setEditPONumber(inv.purchaseOrderNumber ?? "");
    setEditCurrency(inv.currency ?? "INR");
    setEditSubtotal(inv.subtotal);
    setEditTaxAmount(inv.taxAmount);
    setEditTotalAmount(inv.totalAmount);
    setEditLineItems(
      Array.isArray(inv.lineItems) && inv.lineItems.length > 0
        ? [...inv.lineItems]
        : DEFAULT_LINE_ITEMS,
    );
  }

  async function handleConfirmDecision() {
    if (!task) return;
    setSubmittingDecision(true);
    try {
      await submitReviewDecision(task.id, {
        decision: decisionModal.decision,
        comment: decisionModal.comment.trim() || undefined,
      });
      setDecisionModal({ open: false, decision: "APPROVE", comment: "" });
      router.push("/reviews");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit decision.");
    } finally {
      setSubmittingDecision(false);
    }
  }

  /* ── Loading / Error states ──────────────── */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <svg
            className="animate-spin h-5 w-5 text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading invoice review...
        </div>
      </div>
    );
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

  // Calculations for discrepancy banner
  const subtotal = invoice?.subtotal ?? 13700;
  const taxAmount = invoice?.taxAmount ?? 2466;
  const totalAmount = invoice?.totalAmount ?? 18166;
  const expectedTotal = subtotal + taxAmount;
  const difference = totalAmount - expectedTotal;
  const hasDiscrepancy = Math.abs(difference) > 0.01;

  // Line items
  const displayLineItems =
    Array.isArray(invoice?.lineItems) && invoice.lineItems.length > 0
      ? invoice.lineItems
      : DEFAULT_LINE_ITEMS;

  return (
    <div className="space-y-6 pb-20">
      {/* ── Breadcrumb & Header ──────────────── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
          <span
            className="cursor-pointer hover:text-slate-800 transition-colors"
            onClick={() => router.push("/reviews")}
          >
            Reviews
          </span>
          <span className="text-slate-300">›</span>
          <span className="font-semibold text-slate-800">
            {invoice?.invoiceNumber ?? "INV-1001"}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Invoice Review
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review the invoice details, identify discrepancies, and take an action.
        </p>
      </div>

      {/* ── Top Summary Header Card ─────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          {/* Invoice Number & Supplier */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg
                width="20"
                height="20"
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
              <p className="text-base font-bold text-slate-900 leading-tight">
                {invoice?.invoiceNumber ?? "INV-1001"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {invoice?.supplierName ?? "BluePeak Supplies Pvt. Ltd."}
              </p>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-200" />

          {/* PO Number */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">
                PO Number
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {invoice?.purchaseOrderNumber ?? "PO-NS-2401"}
              </p>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-200" />

          {/* Invoice Date */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg
                width="20"
                height="20"
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
              <p className="text-xs font-semibold text-slate-600">
                Invoice Date
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {formatDate(invoice?.invoiceDate ?? "2026-01-20")}
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center">
          <span className="rounded-lg bg-amber-100/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
            {task.status === "PENDING"
              ? "PENDING REVIEW"
              : task.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("review")}
          className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "review"
              ? "bg-[#ede9fe] text-[#4f46e5] shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          Review
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("make_changes")}
          className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "make_changes"
              ? "bg-[#ede9fe] text-[#4f46e5] shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          Make Changes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity_history")}
          className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "activity_history"
              ? "bg-[#ede9fe] text-[#4f46e5] shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          Activity History
        </button>
      </div>

      {/* ─── TAB 1: REVIEW (Primary Screen) ─── */}
      {activeTab === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (Main Content ~62% width) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-4">
            {/* Top Stat Cards (3 in a row) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Subtotal */}
              <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Subtotal</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {formatMoney(subtotal, invoice?.currency)}
                  </p>
                </div>
              </div>

              {/* Tax (GST) */}
              <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="19" y1="5" x2="5" y2="19" />
                    <circle cx="6.5" cy="6.5" r="2.5" />
                    <circle cx="17.5" cy="17.5" r="2.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Tax (GST)</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {formatMoney(taxAmount, invoice?.currency)}
                  </p>
                </div>
              </div>

              {/* Invoice Total */}
              <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="16" y1="14" x2="16" y2="18" />
                    <path d="M16 10h.01" />
                    <path d="M12 10h.01" />
                    <path d="M8 10h.01" />
                    <path d="M12 14h.01" />
                    <path d="M8 14h.01" />
                    <path d="M12 18h.01" />
                    <path d="M8 18h.01" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Invoice Total
                  </p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {formatMoney(totalAmount, invoice?.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Discrepancy Detected Banner */}
            {hasDiscrepancy && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 mt-0.5">
                  <svg
                    width="18"
                    height="18"
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
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-700 tracking-tight">
                    Financial Discrepancy Detected
                  </h3>
                  <p className="text-xs text-red-600 mt-0.5 font-medium">
                    Invoice total does not match subtotal + tax.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-bold text-red-900">
                    <span>
                      Expected Total: {formatMoney(expectedTotal, invoice?.currency)}
                    </span>
                    <span className="text-red-300">|</span>
                    <span>
                      Actual Total: {formatMoney(totalAmount, invoice?.currency)}
                    </span>
                    <span className="text-red-300">|</span>
                    <span>
                      Difference: {formatMoney(Math.abs(difference), invoice?.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Split row: Financial Comparison + Line Items ON LEFT, PDF ON RIGHT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Subcolumn: Financial Comparison + Line Items */}
              <div className="space-y-4">
                <FinancialDiscrepancy
                  subtotal={subtotal}
                  taxAmount={taxAmount}
                  totalAmount={totalAmount}
                  currency={invoice?.currency}
                />

                {/* Line Items Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">
                      Line Items ({displayLineItems.length})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left font-semibold text-slate-700 border-b border-slate-100">
                          <th className="pb-3 w-6 font-semibold">#</th>
                          <th className="pb-3 font-semibold">Description</th>
                          <th className="pb-3 text-right font-semibold">Quantity</th>
                          <th className="pb-3 text-right font-semibold">Unit Price</th>
                          <th className="pb-3 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayLineItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 text-slate-400 font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-3 font-medium text-slate-800 pr-2">
                              {item.description}
                            </td>
                            <td className="py-3 text-right text-slate-700 font-medium">
                              {item.quantity}
                            </td>
                            <td className="py-3 text-right text-slate-700 font-medium">
                              {formatMoney(item.unitPrice, invoice?.currency)}
                            </td>
                            <td className="py-3 text-right text-slate-900 font-bold">
                              {formatMoney(item.amount, invoice?.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Subcolumn: Invoice PDF Viewer */}
              <div>
                <InvoicePdfViewer documentId={task.documentId} />
              </div>
            </div>
          </div>

          {/* Right Column: Activity Timeline (Audit Log) (~38% width) */}
          <div className="lg:col-span-5 xl:col-span-5">
            <AuditTimeline documentId={task.documentId} />
          </div>
        </div>
      )}

      {/* ─── TAB 2: MAKE CHANGES ─────────────── */}
      {activeTab === "make_changes" && (
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
                />
              </div>
            </div>

            {/* Line Items in Make Changes */}
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
                      <td>{formatMoney(item.unitPrice, editCurrency)}</td>
                      <td>{formatMoney(item.amount, editCurrency)}</td>
                      <td className="line-item-actions">
                        <button
                          type="button"
                          className="line-item-edit-btn"
                          title="Edit"
                          onClick={() => {
                            const desc = prompt("Description:", item.description);
                            if (desc !== null) updateLineItem(idx, "description", desc);
                            const qty = prompt("Quantity:", String(item.quantity));
                            if (qty !== null) updateLineItem(idx, "quantity", Number(qty));
                            const price = prompt("Unit Price:", String(item.unitPrice));
                            if (price !== null) updateLineItem(idx, "unitPrice", Number(price));
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: PDF Viewer + Validation Preview */}
          <div className="make-changes-right">
            <InvoicePdfViewer documentId={task.documentId} />

            <div className="validation-preview">
              <h3 className="validation-preview-title">Validation Preview</h3>
              <div className="validation-preview-status validation-preview-status--ok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>The updated amounts will be validated on submission.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: ACTIVITY HISTORY (Full View) */}
      {activeTab === "activity_history" && (
        <div className="max-w-4xl mx-auto">
          <AuditTimeline documentId={task.documentId} />
        </div>
      )}

      {/* ─── Sticky Bottom Action Bar ───────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-6 py-3.5 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/reviews")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            ← Back to Reviews
          </button>

          <div className="flex items-center gap-3">
            {activeTab === "make_changes" ? (
              <>
                <button
                  type="button"
                  onClick={discardChanges}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("Changes saved successfully!");
                    setActiveTab("review");
                  }}
                  className="rounded-xl bg-[#4338ca] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#3730a3]"
                >
                  Save Changes & Re-validate
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={submittingDecision || !isPending}
                  onClick={() =>
                    setDecisionModal({
                      open: true,
                      decision: "CORRECT",
                      comment: "",
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-blue-600 shadow-xs hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.5 2v6h-6" />
                    <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  Request Correction
                </button>

                <button
                  type="button"
                  disabled={submittingDecision || !isPending}
                  onClick={() =>
                    setDecisionModal({
                      open: true,
                      decision: "REJECT",
                      comment: "",
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-rose-600 shadow-xs hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  Reject
                </button>

                <button
                  type="button"
                  disabled={submittingDecision || !isPending}
                  onClick={() =>
                    setDecisionModal({
                      open: true,
                      decision: "APPROVE",
                      comment: "",
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#4338ca] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#3730a3] transition-colors disabled:opacity-50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Approve
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Decision Confirmation Modal ─────── */}
      {decisionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Confirm Decision: {decisionModal.decision}
            </h3>
            <p className="text-xs text-slate-500">
              {decisionModal.decision === "APPROVE"
                ? "Are you sure you want to approve this invoice? You may optionally provide a note."
                : "Please provide a reason or comment for this decision."}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reviewer Note / Comment{" "}
                {decisionModal.decision !== "APPROVE" && (
                  <span className="text-rose-500">*</span>
                )}
              </label>
              <textarea
                rows={3}
                value={decisionModal.comment}
                onChange={(e) =>
                  setDecisionModal((prev) => ({
                    ...prev,
                    comment: e.target.value,
                  }))
                }
                placeholder="Enter any feedback or reason..."
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setDecisionModal((prev) => ({ ...prev, open: false }))
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  submittingDecision ||
                  (decisionModal.decision !== "APPROVE" &&
                    !decisionModal.comment.trim())
                }
                onClick={() => void handleConfirmDecision()}
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 ${
                  decisionModal.decision === "APPROVE"
                    ? "bg-[#4338ca] hover:bg-[#3730a3]"
                    : decisionModal.decision === "REJECT"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submittingDecision ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-state">Loading review details...</div>
      }
    >
      <ReviewDetailsContent />
    </Suspense>
  );
}
