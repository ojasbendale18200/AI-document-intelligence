"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  success: boolean;
  message: string;
};

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkBackend() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

        if (!baseUrl) {
          throw new Error("Backend API URL is not configured.");
        }

        const response = await fetch(`${baseUrl}/health`);

        if (!response.ok) {
          throw new Error(`Backend returned HTTP ${response.status}`);
        }

        const data: HealthResponse = await response.json();

        setHealth(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to connect to the backend.",
        );
      } finally {
        setLoading(false);
      }
    }

    checkBackend();
  }, []);

  return (
    <main className="min-h-screen p-8 sm:p-12">
      {" "}
      <div className="mx-auto max-w-3xl">
        {" "}
        <h1 className="text-3xl font-bold">AI Document Intelligence </h1>
        <p className="mt-3 text-gray-600">
          Document processing and workflow automation platform.
        </p>
        <section className="mt-8 rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Backend Connection</h2>

          {loading && <p className="mt-3">Checking backend connection...</p>}

          {!loading && health && (
            <div className="mt-3">
              <p className="font-medium text-green-700">
                Connected successfully
              </p>

              <p className="mt-2">{health.message}</p>
            </div>
          )}

          {!loading && error && (
            <div className="mt-3">
              <p className="font-medium text-red-700">Connection failed</p>

              <p className="mt-2">{error}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
