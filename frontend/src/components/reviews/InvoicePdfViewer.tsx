"use client";

import { getDocumentPdf } from "@/src/lib/api/documents";
import { useEffect, useState } from "react";

interface InvoicePdfViewerProps {
  documentId: string;
}

export default function InvoicePdfViewer({
  documentId,
}: InvoicePdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);

        const blob = await getDocumentPdf(documentId);

        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);

        setPdfUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load invoice PDF",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 text-sm">
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
          Loading invoice PDF...
        </div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-6 text-red-600">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-2 text-red-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-sm font-medium">
          {error || "PDF preview unavailable"}
        </span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <h3 className="font-bold text-slate-900 text-sm tracking-tight">
          Invoice PDF
        </h3>

        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Open PDF in new tab"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>

      {/* PDF Viewframe */}
      <iframe
        src={pdfUrl}
        title="Invoice PDF Preview"
        className="h-[520px] w-full border-none bg-slate-50"
      />

      {/* Dark Toolbar at bottom */}
      <div className="flex items-center justify-between bg-[#1e293b] px-4 py-2.5 text-xs text-slate-200">
        <span className="font-medium text-slate-300">Page 1 of 1</span>

        <div className="flex items-center gap-3 font-semibold">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-700 text-slate-200"
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-700 text-slate-200"
            title="Zoom in"
          >
            +
          </button>
          <span className="text-slate-300 font-normal cursor-pointer hover:text-white px-1">
            100% ▾
          </span>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-700 text-slate-200 ml-1"
            title="Fullscreen"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
