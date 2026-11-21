const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export async function getDocumentPdf(documentId: string): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/documents/${documentId}/download`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to load invoice PDF");
  }

  const blob = await response.blob();

  if (blob.type !== "application/pdf") {
    throw new Error("The requested document is not a PDF");
  }

  return blob;
}
