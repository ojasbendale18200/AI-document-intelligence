import { Router } from "express";

import {
  runInvoiceValidation,
  InvoiceValidationRunnerError,
} from "../services/invoice-validation-runner.service.js";

const router = Router();

router.post("/:id/validate", async (req, res, next) => {
  try {
    const result = await runInvoiceValidation(req.params.id);

    res.status(200).json({
      success: true,
      message: "Invoice validation completed",
      data: result,
    });
  } catch (error) {
    if (error instanceof InvoiceValidationRunnerError) {
      res.status(404).json({
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
