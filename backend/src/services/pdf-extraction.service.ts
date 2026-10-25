import fs from "node:fs/promises";
import path from "node:path";
import type PDFParse from "pdf-parse";
// @ts-ignore - pdf-parse/index.js runs debug test code when imported in an ESM context
import pdfParseModule from "pdf-parse/lib/pdf-parse.js";

const pdfParse = pdfParseModule as typeof PDFParse;
import prisma from "../config/prisma.js";

// Keep this aligned with the storage directory used by Multer.
// This default assumes the backend development server is started
// with the backend directory as its current working directory.
const documentStorageDirectory = path.resolve(
  process.env.DOCUMENT_STORAGE_DIR || "storage/documents",
);

export class PdfExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

export async function extractDocumentText(documentId: string) {
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
    },
  });

  if (!document) {
    throw new PdfExtractionError("Document not found");
  }

  if (document.mimeType !== "application/pdf") {
    throw new PdfExtractionError("The document is not a PDF");
  }

  const filePath = path.join(documentStorageDirectory, document.storageKey);

  let pdfBuffer: Buffer;

  try {
    pdfBuffer = await fs.readFile(filePath);
  } catch {
    throw new PdfExtractionError("The PDF file could not be found in storage");
  }

  let parsedPdf: Awaited<ReturnType<typeof pdfParse>>;

  try {
    parsedPdf = await pdfParse(pdfBuffer);
  } catch {
    throw new PdfExtractionError(
      "The PDF could not be parsed. It may be damaged or unsupported.",
    );
  }

  const extractedText = parsedPdf.text.trim();

  if (!extractedText) {
    throw new PdfExtractionError(
      "No extractable text was found. This PDF may require OCR.",
    );
  }

  const updatedDocument = await prisma.document.update({
    where: {
      id: document.id,
    },
    data: {
      extractedText,
      pageCount: parsedPdf.numpages,
      extractedAt: new Date(),
      status: "TEXT_EXTRACTED",
    },
  });

  return {
    document: updatedDocument,
    extractedText,
    pageCount: parsedPdf.numpages,
    characterCount: extractedText.length,
  };
}
