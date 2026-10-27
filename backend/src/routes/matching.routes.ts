import { Router } from "express";

import { matchInvoiceToPurchaseOrder } from "../services/purchase-order-matching.service.js";

const router = Router();

router.post("/:id/match-po", async (req, res, next) => {
  try {
    const result = await matchInvoiceToPurchaseOrder(req.params.id);

    res.status(200).json({
      success: true,
      message: "Purchase order matching completed",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVOICE_NOT_FOUND") {
        res.status(404).json({
          success: false,
          message: "Invoice extraction must be completed first",
        });

        return;
      }

      if (error.message === "PO_NUMBER_MISSING") {
        res.status(422).json({
          success: false,
          message: "The invoice does not contain a purchase order number",
        });

        return;
      }

      if (error.message === "PURCHASE_ORDER_NOT_FOUND") {
        res.status(404).json({
          success: false,
          message: "The referenced purchase order was not found",
        });

        return;
      }
    }

    next(error);
  }
});

export default router;
