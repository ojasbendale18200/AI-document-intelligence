"use client";

import { useEffect, useState } from "react";

type DocumentRecord = {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type DocumentsResponse = {
  success: boolean;
  data: DocumentRecord[];
};

export default function Home() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

        if (!baseUrl) {
          throw new Error("Backend API URL is not configured.");
        }

        const response = await fetch(`${baseUrl}/api/documents`);

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const result: DocumentsResponse = await response.json();

        setDocuments(result.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load documents.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, []);

  return (
    <main className="min-h-screen p-8">
      {" "}
      <div className="mx-auto max-w-4xl">
        {" "}
        <h1 className="text-3xl font-bold">AI Document Intelligence </h1>
        <p className="mt-2 text-gray-600">
          Document processing and workflow automation.
        </p>
        <section className="mt-8 rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Documents</h2>

          {loading && <p className="mt-4">Loading documents...</p>}

          {error && <p className="mt-4 text-red-700">{error}</p>}

          {!loading && !error && documents.length === 0 && (
            <p className="mt-4 text-gray-600">
              No documents have been added yet.
            </p>
          )}

          {documents.length > 0 && (
            <ul className="mt-4 space-y-3">
              {documents.map((document) => (
                <li key={document.id} className="rounded-lg border p-4">
                  <p className="font-medium">{document.filename}</p>
                  <p className="text-sm text-gray-600">
                    Status: {document.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
