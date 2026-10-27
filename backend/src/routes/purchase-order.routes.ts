import { Router } from "express";
import { Prisma } from "@prisma/client";

import prisma from "../config/prisma.js";
import { createPurchaseOrderSchema } from "../validators/purchase-order.validator.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const input = createPurchaseOrderSchema.parse(req.body);

    // Validate line-item calculations using integer minor units.
    const toMinorUnits = (value: number) => Math.round(value * 100);

    for (const item of input.lineItems) {
      const calculatedAmount = toMinorUnits(item.quantity * item.unitPrice);

      const submittedAmount = toMinorUnits(item.expectedAmount);

      if (Math.abs(calculatedAmount - submittedAmount) > 1) {
        res.status(400).json({
          success: false,
          message: `Expected amount does not match quantity × unit price for "${item.description}"`,
        });

        return;
      }
    }

    const calculatedSubtotalMinor = input.lineItems.reduce(
      (sum, item) => sum + toMinorUnits(item.expectedAmount),
      0,
    );

    const submittedTotalMinor = toMinorUnits(input.expectedTotal);

    if (submittedTotalMinor < calculatedSubtotalMinor) {
      res.status(400).json({
        success: false,
        message: "Expected total cannot be less than the line-item subtotal",
      });

      return;
    }

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber: input.poNumber,
        supplierName: input.supplierName,
        supplierTaxId: input.supplierTaxId ?? null,
        buyerName: input.buyerName,
        currency: input.currency,
        orderDate: input.orderDate ? new Date(input.orderDate) : null,
        expectedTotal: new Prisma.Decimal(input.expectedTotal),

        lineItems: {
          create: input.lineItems.map((item) => ({
            description: item.description,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            expectedAmount: new Prisma.Decimal(item.expectedAmount),
          })),
        },
      },

      include: {
        lineItems: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        success: false,
        message: "A purchase order with this PO number already exists",
      });

      return;
    }
  }
});

router.get("/", async (_req, res, next) => {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        lineItems: true,
      },
    });

    res.status(200).json({
      success: true,
      data: purchaseOrders,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
