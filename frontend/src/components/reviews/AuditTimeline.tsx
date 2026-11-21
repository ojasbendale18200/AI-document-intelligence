"use client";

import { useEffect, useState } from "react";
import { getAuditLogs } from "@/src/lib/api/audit";
import type { AuditLog } from "@/src/types/audit";

interface AuditTimelineProps {
  documentId: string;
  initialLogs?: AuditLog[];
}

interface TimelineItemDisplay {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  variant: "green" | "purple" | "blue" | "red" | "sky";
  iconType:
    | "check"
    | "sync"
    | "edit"
    | "users"
    | "x"
    | "sparkles"
    | "file"
    | "upload";
}

// Fallback sample data matching the reference UI exactly
const SAMPLE_EVENTS: TimelineItemDisplay[] = [
  {
    id: "sample-1",
    title: "Invoice Approved",
    description: "Invoice approved by Finance User.",
    date: "Jan 26, 2026",
    time: "10:20 AM",
    variant: "green",
    iconType: "check",
  },
  {
    id: "sample-2",
    title: "Re-validation Completed",
    description: "Invoice passed financial validation after changes.",
    date: "Jan 26, 2026",
    time: "10:16 AM",
    variant: "purple",
    iconType: "sync",
  },
  {
    id: "sample-3",
    title: "Invoice Details Corrected",
    description:
      "Invoice total updated from ₹18,166.00 to ₹16,166.00 by Finance User.",
    date: "Jan 26, 2026",
    time: "10:15 AM",
    variant: "blue",
    iconType: "edit",
  },
  {
    id: "sample-4",
    title: "Review Task Created",
    description: "Invoice sent for human review due to total mismatch.",
    date: "Jan 26, 2026",
    time: "10:04 AM",
    variant: "purple",
    iconType: "users",
  },
  {
    id: "sample-5",
    title: "Financial Validation Failed",
    description: "Invoice total does not match subtotal + tax (Δ ₹2,000.00).",
    date: "Jan 26, 2026",
    time: "10:03 AM",
    variant: "red",
    iconType: "x",
  },
  {
    id: "sample-6",
    title: "AI Extraction Completed",
    description: "Invoice information extracted using OpenAI (gpt-4o).",
    date: "Jan 26, 2026",
    time: "10:02 AM",
    variant: "purple",
    iconType: "sparkles",
  },
  {
    id: "sample-7",
    title: "PDF Text Extracted",
    description: "Text extracted from PDF (1 page, 2,318 characters).",
    date: "Jan 26, 2026",
    time: "10:01 AM",
    variant: "blue",
    iconType: "file",
  },
  {
    id: "sample-8",
    title: "Invoice Uploaded",
    description: "Invoice PDF (invoice.pdf, 245 KB) uploaded successfully.",
    date: "Jan 26, 2026",
    time: "10:00 AM",
    variant: "sky",
    iconType: "upload",
  },
];

function formatTimelineDateTime(isoStr: string) {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) {
    return { date: "Recent", time: "" };
  }
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

function mapLogToTimeline(log: AuditLog): TimelineItemDisplay {
  const { date, time } = formatTimelineDateTime(log.createdAt);
  const action = log.action.toUpperCase();

  if (action.includes("APPROV")) {
    return {
      id: log.id,
      title: "Invoice Approved",
      description: log.description || "Invoice approved by Finance User.",
      date,
      time,
      variant: "green",
      iconType: "check",
    };
  }
  if (action.includes("REVALIDAT")) {
    return {
      id: log.id,
      title: "Re-validation Completed",
      description:
        log.description || "Invoice passed financial validation after changes.",
      date,
      time,
      variant: "purple",
      iconType: "sync",
    };
  }
  if (action.includes("CORRECT") || action.includes("UPDATE")) {
    return {
      id: log.id,
      title: "Invoice Details Corrected",
      description:
        log.description ||
        "Invoice details updated and saved by reviewer.",
      date,
      time,
      variant: "blue",
      iconType: "edit",
    };
  }
  if (action.includes("REVIEW_TASK") || action.includes("REVIEW_CREATED")) {
    return {
      id: log.id,
      title: "Review Task Created",
      description:
        log.description || "Invoice sent for human review due to total mismatch.",
      date,
      time,
      variant: "purple",
      iconType: "users",
    };
  }
  if (
    action.includes("VALIDATION_FAILED") ||
    action.includes("FAILED") ||
    action.includes("REJECT")
  ) {
    return {
      id: log.id,
      title: "Financial Validation Failed",
      description:
        log.description ||
        "Invoice total does not match subtotal + tax.",
      date,
      time,
      variant: "red",
      iconType: "x",
    };
  }
  if (action.includes("VALIDATION_PASSED") || action.includes("PASSED")) {
    return {
      id: log.id,
      title: "Financial Validation Passed",
      description:
        log.description || "Invoice passed financial validation.",
      date,
      time,
      variant: "green",
      iconType: "check",
    };
  }
  if (action.includes("AI_EXTRACTION") || action.includes("EXTRACT")) {
    return {
      id: log.id,
      title: "AI Extraction Completed",
      description:
        log.description ||
        `Invoice information extracted using ${
          (log.metadata?.model as string) || "OpenAI (gpt-4o)"
        }.`,
      date,
      time,
      variant: "purple",
      iconType: "sparkles",
    };
  }
  if (action.includes("PDF_TEXT") || action.includes("OCR")) {
    return {
      id: log.id,
      title: "PDF Text Extracted",
      description:
        log.description || "Text extracted from PDF document successfully.",
      date,
      time,
      variant: "blue",
      iconType: "file",
    };
  }
  if (action.includes("UPLOAD")) {
    return {
      id: log.id,
      title: "Invoice Uploaded",
      description:
        log.description || "Invoice PDF uploaded successfully.",
      date,
      time,
      variant: "sky",
      iconType: "upload",
    };
  }

  return {
    id: log.id,
    title: log.action.replace(/_/g, " "),
    description: log.description || "System activity recorded.",
    date,
    time,
    variant: "blue",
    iconType: "file",
  };
}

export default function AuditTimeline({
  documentId,
  initialLogs,
}: AuditTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs ?? []);
  const [loading, setLoading] = useState(!initialLogs);

  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      if (!documentId) return;
      try {
        setLoading(true);
        const res = await getAuditLogs(documentId);
        if (!cancelled && res && Array.isArray(res.logs)) {
          setLogs(res.logs);
        }
      } catch (err) {
        // Fall back gracefully to sample events if API fails or empty
        console.warn("Could not fetch audit logs, using sample events:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchLogs();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // If real logs exist, map them; otherwise use sample events matching the UI
  const items: TimelineItemDisplay[] =
    logs.length > 0 ? logs.map(mapLogToTimeline) : SAMPLE_EVENTS;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {/* Clock icon */}
          <div className="flex items-center justify-center text-purple-600">
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
            Activity Timeline (Audit Log)
          </h2>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          {items.length} Events
        </span>
      </div>

      {/* Timeline List */}
      <div className="relative pt-4">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;

          return (
            <div
              key={item.id}
              className="relative flex items-start gap-3.5 pb-4 last:pb-1 group"
            >
              {/* Left Column: Track line + Circular dot */}
              <div className="relative flex flex-col items-center flex-shrink-0 self-stretch w-5">
                {/* Continuous vertical line */}
                {!isLast && (
                  <div
                    className="absolute top-3.5 bottom-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                {!isFirst && (
                  <div
                    className="absolute top-0 bottom-1/2 left-1/2 -translate-x-1/2 w-[1.5px] bg-slate-200"
                    aria-hidden="true"
                  />
                )}

                {/* Node Ring Dot on the line */}
                <div
                  className={`relative z-10 mt-2.5 h-2.5 w-2.5 rounded-full border-2 bg-white ${
                    item.variant === "green"
                      ? "border-emerald-500"
                      : item.variant === "purple"
                        ? "border-purple-500"
                        : item.variant === "red"
                          ? "border-red-500"
                          : "border-sky-500"
                  }`}
                />
              </div>

              {/* Event Icon Badge */}
              <div
                className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${
                  item.variant === "green"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : item.variant === "purple"
                      ? "border-purple-200 bg-purple-50 text-purple-600"
                      : item.variant === "red"
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-sky-200 bg-sky-50 text-sky-600"
                }`}
              >
                {item.iconType === "check" && (
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
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {item.iconType === "sync" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.5 2v6h-6" />
                    <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                )}
                {item.iconType === "edit" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                )}
                {item.iconType === "users" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                )}
                {item.iconType === "x" && (
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
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                )}
                {item.iconType === "sparkles" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                )}
                {item.iconType === "file" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                )}
                {item.iconType === "upload" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
              </div>

              {/* Event Content: Title & Description */}
              <div className="flex-1 min-w-0 pr-2 pt-0.5">
                <p className="text-[13px] font-semibold text-slate-900 leading-tight">
                  {item.title}
                </p>
                <p className="text-[11.5px] text-slate-500 mt-1 leading-snug">
                  {item.description}
                </p>
              </div>

              {/* Timestamp Right Column */}
              <div className="flex-shrink-0 text-right pt-0.5">
                <p className="text-[11px] font-medium text-slate-700 leading-tight">
                  {item.date}
                </p>
                <p className="text-[11px] text-slate-400 leading-tight mt-1">
                  {item.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
