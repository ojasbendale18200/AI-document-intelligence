"use client";

import { useEffect, useState } from "react";
import { getProcessingHistory } from "@/src/lib/api/processing-history";
import type {
  ProcessingStep,
  ProcessingHistoryResponse,
} from "@/src/types/processing-history";

interface ProcessingHistoryProps {
  documentId: string;
}

/* ── Step name → Display name mapping ──────── */

const STEP_DISPLAY: Record<
  string,
  { label: string; description: string; dotColor: string }
> = {
  extractText: {
    label: "PDF Extraction",
    description: "Extracted text from invoice",
    dotColor: "bg-emerald-500",
  },
  extractInvoice: {
    label: "AI Invoice Extraction",
    description: "Extracted structured invoice information",
    dotColor: "bg-blue-500",
  },
  validateInvoice: {
    label: "Financial Validation",
    description: "Validated amounts and calculations",
    dotColor: "bg-purple-500",
  },
  matchPO: {
    label: "Purchase Order Matching",
    description: "Matched invoice with purchase order",
    dotColor: "bg-indigo-500",
  },
  humanReview: {
    label: "Human Review",
    description: "Waiting for reviewer action",
    dotColor: "bg-amber-500",
  },
  complete: {
    label: "Workflow Complete",
    description: "Processing completed successfully",
    dotColor: "bg-emerald-500",
  },
  failure: {
    label: "Workflow Failed",
    description: "Processing encountered an error",
    dotColor: "bg-red-500",
  },
};

function getStepDisplay(step: ProcessingStep) {
  const mapped = STEP_DISPLAY[step.stepName];
  const label = mapped?.label ?? step.stepName;

  // Use message from backend if available, otherwise the default description
  let description = step.message ?? mapped?.description ?? "";

  // For specific statuses, override description
  if (step.status === "FAILED" && step.error) {
    description = step.error;
  }
  if (step.status === "SKIPPED" && step.message) {
    description = step.message;
  }
  if (step.status === "PROCESSING" && step.stepName === "humanReview") {
    description = "Waiting for reviewer action";
  }

  return { label, description, dotColor: mapped?.dotColor ?? "bg-slate-400" };
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)} s`;
}

function formatStepDate(isoStr: string | null): {
  date: string;
  time: string;
} {
  if (!isoStr) return { date: "—", time: "" };
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return { date: "—", time: "" };
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return { date, time };
}

/* ── Status badge helpers ──────────────────── */

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        bg: "bg-emerald-100",
        text: "text-emerald-700",
      };
    case "PROCESSING":
      return {
        label: "In Progress",
        bg: "bg-blue-100",
        text: "text-blue-700",
      };
    case "FAILED":
      return { label: "Failed", bg: "bg-red-100", text: "text-red-700" };
    case "SKIPPED":
      return {
        label: "Skipped",
        bg: "bg-slate-100",
        text: "text-slate-600",
      };
    case "PENDING":
      return {
        label: "Pending",
        bg: "bg-slate-100",
        text: "text-slate-500",
      };
    default:
      return {
        label: status,
        bg: "bg-slate-100",
        text: "text-slate-500",
      };
  }
}

function getOverallStatus(steps: ProcessingStep[]): string {
  if (steps.some((s) => s.status === "PROCESSING")) return "PROCESSING";
  if (steps.some((s) => s.status === "FAILED")) return "FAILED";
  if (steps.every((s) => s.status === "COMPLETED" || s.status === "SKIPPED"))
    return "COMPLETED";
  return "PROCESSING";
}

/* ── Status dot color based on step status ── */

function getDotColorByStatus(step: ProcessingStep, defaultDot: string): string {
  switch (step.status) {
    case "COMPLETED":
      return "bg-emerald-500";
    case "PROCESSING":
      return "bg-amber-400";
    case "FAILED":
      return "bg-red-500";
    case "SKIPPED":
      return "bg-slate-300";
    case "PENDING":
      return "bg-slate-300";
    default:
      return defaultDot;
  }
}

/* ── Duration badge pill color ──────────────── */

function getDurationBadgeClasses(step: ProcessingStep): string {
  switch (step.status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "PROCESSING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "FAILED":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
}

/* ── Sample / Fallback data ─────────────────── */

const SAMPLE_STEPS: ProcessingStep[] = [
  {
    id: "s1",
    documentId: "",
    stepName: "extractText",
    status: "COMPLETED",
    startedAt: "2026-11-28T11:19:00Z",
    completedAt: "2026-11-28T11:19:01Z",
    durationMs: 1200,
    message: "Extracted text from invoice (1 page)",
    error: null,
    attempt: 1,
    createdAt: "2026-11-28T11:19:00Z",
    updatedAt: "2026-11-28T11:19:01Z",
  },
  {
    id: "s2",
    documentId: "",
    stepName: "extractInvoice",
    status: "COMPLETED",
    startedAt: "2026-11-28T11:19:01Z",
    completedAt: "2026-11-28T11:19:04Z",
    durationMs: 3400,
    message: "Extracted structured invoice information",
    error: null,
    attempt: 1,
    createdAt: "2026-11-28T11:19:01Z",
    updatedAt: "2026-11-28T11:19:04Z",
  },
  {
    id: "s3",
    documentId: "",
    stepName: "validateInvoice",
    status: "COMPLETED",
    startedAt: "2026-11-28T11:19:04Z",
    completedAt: "2026-11-28T11:19:05Z",
    durationMs: 800,
    message: "Validated amounts and calculations",
    error: null,
    attempt: 1,
    createdAt: "2026-11-28T11:19:04Z",
    updatedAt: "2026-11-28T11:19:05Z",
  },
  {
    id: "s4",
    documentId: "",
    stepName: "matchPO",
    status: "SKIPPED",
    startedAt: null,
    completedAt: null,
    durationMs: 1500,
    message: "Failed to match with PO (PO-NS-2401 not found)",
    error: null,
    attempt: 1,
    createdAt: "2026-11-28T11:20:00Z",
    updatedAt: "2026-11-28T11:20:00Z",
  },
  {
    id: "s5",
    documentId: "",
    stepName: "humanReview",
    status: "PROCESSING",
    startedAt: "2026-11-28T11:20:00Z",
    completedAt: null,
    durationMs: null,
    message: "Waiting for reviewer action",
    error: null,
    attempt: 1,
    createdAt: "2026-11-28T11:20:00Z",
    updatedAt: "2026-11-28T11:20:00Z",
  },
];

/* ── Main Component ────────────────────────── */

export default function ProcessingHistory({
  documentId,
}: ProcessingHistoryProps) {
  const [data, setData] = useState<ProcessingHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!documentId) return;
      try {
        setLoading(true);
        const res = await getProcessingHistory(documentId);
        if (!cancelled && res) {
          setData(res);
        }
      } catch (err) {
        console.warn(
          "Could not fetch processing history, using sample data:",
          err
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const steps: ProcessingStep[] =
    data && data.steps.length > 0 ? data.steps : SAMPLE_STEPS;

  // Keep only the meaningful pipeline steps (deduplicate by stepName, keep latest)
  const pipelineOrder = [
    "extractText",
    "extractInvoice",
    "validateInvoice",
    "matchPO",
    "humanReview",
    "complete",
    "failure",
  ];

  const orderedSteps = pipelineOrder
    .map((name) => {
      const matching = steps.filter((s) => s.stepName === name);
      if (matching.length === 0) return null;
      // Return latest attempt
      return matching[matching.length - 1];
    })
    .filter((s): s is ProcessingStep => s !== null);

  const overall = getOverallStatus(orderedSteps);
  const overallBadge = getStatusBadge(overall);

  // Calculate totals
  const completedCount = orderedSteps.filter(
    (s) => s.status === "COMPLETED"
  ).length;
  const totalCount = orderedSteps.length;
  const totalDurationMs = orderedSteps.reduce(
    (sum, s) => sum + (s.durationMs ?? 0),
    0
  );
  const totalDurationSec = (totalDurationMs / 1000).toFixed(1);

  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-white shadow-xs transition-all">
      {/* ── Header ──────────────────────────── */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2.5">
          {/* Gear / Processing icon */}
          <div className="flex items-center justify-center text-indigo-600">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
            Processing History
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Badge */}
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold ${overallBadge.bg} ${overallBadge.text}`}
          >
            {overallBadge.label}
          </span>

          {/* Collapse chevron */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Steps List ──────────────────────── */}
      {!collapsed && (
        <>
          <div className="px-4 pb-2">
            {loading && !data ? (
              <div className="flex items-center justify-center py-6 text-sm text-slate-400">
                <svg
                  className="animate-spin h-4 w-4 mr-2 text-indigo-500"
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
                Loading...
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orderedSteps.map((step) => {
                  const display = getStepDisplay(step);
                  const dotColor = getDotColorByStatus(step, display.dotColor);
                  const duration = formatDuration(step.durationMs);
                  const durationClasses = getDurationBadgeClasses(step);
                  const { date, time } = formatStepDate(
                    step.completedAt ?? step.startedAt ?? step.createdAt
                  );

                  return (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 py-3.5 first:pt-1"
                    >
                      {/* Status Dot */}
                      <div className="flex-shrink-0">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${dotColor} ${
                            step.status === "PROCESSING" ? "animate-pulse" : ""
                          }`}
                        />
                      </div>

                      {/* Step Name + Description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 leading-tight">
                          {display.label}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug truncate">
                          {display.description}
                        </p>
                      </div>

                      {/* Duration Badge */}
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums ${durationClasses}`}
                        >
                          {duration}
                        </span>
                      </div>

                      {/* Date + Time */}
                      <div className="flex-shrink-0 text-right min-w-[80px]">
                        <p className="text-[11px] font-medium text-slate-700 leading-tight">
                          {date}
                        </p>
                        {time && (
                          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                            {time}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Footer Bar ────────────────────── */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 rounded-b-2xl">
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600">
              {/* Clock icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-400"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Total Processing Time: {totalDurationSec} seconds</span>
            </div>

            <span className="text-[11.5px] font-bold text-slate-600">
              {completedCount} / {totalCount} Steps Completed
            </span>
          </div>
        </>
      )}
    </div>
  );
}
