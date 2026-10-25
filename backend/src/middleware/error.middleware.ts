import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        success: false,
        message: "PDF must not exceed 10 MB",
      });
      return;
    }

    if (
      error.code === "LIMIT_FILE_COUNT" ||
      error.code === "LIMIT_UNEXPECTED_FILE"
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid file upload",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: "The file upload could not be processed",
    });
    return;
  }

  if (
    error instanceof Error &&
    error.message === "Only PDF files are allowed"
  ) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return;
  }

  console.error("Unhandled error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
