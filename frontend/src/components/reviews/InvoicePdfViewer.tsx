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
      <div className="flex h-[600px] items-center justify-center rounded-xl border">
        Loading invoice PDF...
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
        {error || "PDF preview unavailable"}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Invoice PDF</h3>

        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Open PDF
        </a>
      </div>

      <iframe
        src={pdfUrl}
        title="Invoice PDF Preview"
        className="h-[650px] w-full"
      />
    </div>
  );
}
