import { Router } from "express";
import {
  extractDocumentText,
  PdfExtractionError,
} from "../services/pdf-extraction.service.js";

const router = Router();

router.post("/:id/extract", async (req, res, next) => {
  try {
    const result = await extractDocumentText(req.params.id);

    res.status(200).json({
      success: true,
      message: "PDF text extracted successfully",
      data: {
        id: result.document.id,
        filename: result.document.filename,
        status: result.document.status,
        pageCount: result.pageCount,
        characterCount: result.characterCount,
        extractedText: result.extractedText,
      },
    });
  } catch (error) {
    if (error instanceof PdfExtractionError) {
      const statusCode = error.message === "Document not found" ? 404 : 422;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });

      return;
    }

    next(error);
  }
});

export default router;
