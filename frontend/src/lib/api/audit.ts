import { AuditLogResponse } from "@/src/types/audit";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export async function getAuditLogs(
  documentId: string
): Promise<AuditLogResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/audit-logs/documents/${documentId}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Unable to fetch audit history");
  }

  return response.json();
}