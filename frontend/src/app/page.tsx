"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";

type DocumentRecord = {
  id: string;
  filename: string;
  storageKey: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: DocumentRecord[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export default function Home() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/documents`);
      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load documents");
      }

      setDocuments(result.data ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setMessage("");

    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setMessage("Please select a PDF file.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("The PDF must be 10 MB or smaller.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setMessage("Please select a PDF before uploading.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Upload failed");
      }

      setMessage("PDF uploaded successfully.");
      setSelectedFile(null);

      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      {" "}
      <div className="mx-auto max-w-5xl">
        {" "}
        <header className="mb-8">
          {" "}
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            AI Document Intelligence{" "}
          </p>
          <h1 className="mt-2 text-3xl font-bold">Document Dashboard</h1>
          <p className="mt-2 text-slate-600">Upload and manage invoice PDFs.</p>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Upload a PDF invoice</h2>

          <p className="mt-2 text-sm text-slate-600">
            Select a PDF file up to 10 MB.
          </p>

          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="mt-5 block w-full rounded-lg border border-slate-300 p-3 text-sm"
          />

          {selectedFile && (
            <p className="mt-3 text-sm text-slate-600">
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)}
              )
            </p>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload PDF"}
          </button>

          {message && (
            <p role="status" className="mt-4 text-sm text-slate-700">
              {message}
            </p>
          )}
        </section>
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Uploaded documents</h2>

            <button
              type="button"
              onClick={() => void loadDocuments()}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-slate-600">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-slate-600">No documents uploaded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4 font-medium">Filename</th>
                    <th className="py-3 pr-4 font-medium">Size</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Uploaded</th>
                    <th className="py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((document) => (
                    <tr
                      key={document.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-4 pr-4 font-medium">
                        {document.filename}
                      </td>

                      <td className="py-4 pr-4">
                        {formatFileSize(document.size)}
                      </td>

                      <td className="py-4 pr-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          {document.status}
                        </span>
                      </td>

                      <td className="py-4 pr-4">
                        {new Date(document.createdAt).toLocaleString()}
                      </td>

                      <td className="py-4 text-right">
                        <a
                          href={`${API_BASE_URL}/api/documents/${document.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-700 hover:underline"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
