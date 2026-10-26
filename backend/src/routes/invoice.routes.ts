import { Router } from "express";

import {
  extractInvoiceData,
  InvoiceExtractionError,
} from "../services/invoice-extraction.service.js";

const router = Router();

router.post("/:id/analyze", async (req, res, next) => {
  try {
    const invoice = await extractInvoiceData(req.params.id);

    res.status(200).json({
      success: true,
      message: "Invoice data extracted successfully",
      data: invoice,
    });
  } catch (error) {
    if (error instanceof InvoiceExtractionError) {
      const statusCode =
        error.code === "DOCUMENT_NOT_FOUND"
          ? 404
          : error.code === "TEXT_NOT_AVAILABLE"
            ? 409
            : 422;

      res.status(statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
      });

      return;
    }

    next(error);
  }
});

export default router;
