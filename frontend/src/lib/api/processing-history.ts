import type { ProcessingHistoryResponse } from "@/src/types/processing-history";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export async function getProcessingHistory(
  documentId: string
): Promise<ProcessingHistoryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/documents/${documentId}/processing-history`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Unable to fetch processing history");
  }

  return response.json();
}
