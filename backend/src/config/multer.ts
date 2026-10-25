import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

// This config file is located at src/config/multer.ts (or dist/config/multer.js).
// Going up two levels reaches the backend directory.
const backendDirectory = path.resolve(currentDirectory, "../..");

export const documentStorageDirectory = path.resolve(
  process.env.DOCUMENT_STORAGE_DIR || "storage/documents"
);

fs.mkdirSync(documentStorageDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, documentStorageDirectory);
  },

  filename: (_req, _file, callback) => {
    // Do not use the client-supplied filename as the physical filename.
    callback(null, `${randomUUID()}.pdf`);
  },
});

const pdfFileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  // This is only an initial check. We will inspect the actual file contents
  // after Multer writes the file to disk.
  if (file.mimetype !== "application/pdf") {
    callback(new Error("Only PDF files are allowed"));
    return;
  }

  callback(null, true);
};

export const uploadPdf = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
    fields: 5,
    parts: 6,
  },
});
