import { Prisma } from "@prisma/client";

import prisma from "../config/prisma.js";

export type MatchIssue = {
  code: string;
  severity: "ERROR" | "WARNING";
  field: string;
  message: string;
  expected?: string | number;
  actual?: string | number;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function toMinorUnits(value: number | Prisma.Decimal): number {
  const numericValue =
    value instanceof Prisma.Decimal ? value.toNumber() : value;

  return Math.round(numericValue * 100);
}

function approximatelyEqualMoney(
  first: number | Prisma.Decimal,
  second: number | Prisma.Decimal,
  toleranceMinorUnits = 1,
): boolean {
  return (
    Math.abs(toMinorUnits(first) - toMinorUnits(second)) <= toleranceMinorUnits
  );
}

export async function matchInvoiceToPurchaseOrder(documentId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: {
      documentId,
    },
    include: {
      document: true,
    },
  });

  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  if (!invoice.purchaseOrderNumber) {
    throw new Error("PO_NUMBER_MISSING");
  }

  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: {
      poNumber: invoice.purchaseOrderNumber,
    },
    include: {
      lineItems: true,
    },
  });

  if (!purchaseOrder) {
    throw new Error("PURCHASE_ORDER_NOT_FOUND");
  }

  const issues: MatchIssue[] = [];

  // 1. Compare supplier identity.
  if (
    normalizeText(invoice.supplierName) !==
    normalizeText(purchaseOrder.supplierName)
  ) {
    issues.push({
      code: "SUPPLIER_MISMATCH",
      severity: "ERROR",
      field: "supplierName",
      message: "Invoice supplier does not match the purchase order supplier",
      expected: purchaseOrder.supplierName,
      actual: invoice.supplierName ?? "",
    });
  }

  // 2. Compare currency.
  if (
    normalizeText(invoice.currency) !== normalizeText(purchaseOrder.currency)
  ) {
    issues.push({
      code: "CURRENCY_MISMATCH",
      severity: "ERROR",
      field: "currency",
      message: "Invoice currency does not match the purchase order currency",
      expected: purchaseOrder.currency,
      actual: invoice.currency ?? "",
    });
  }

  // 3. Compare supplier tax IDs when both are available.
  if (
    invoice.supplierTaxId &&
    purchaseOrder.supplierTaxId &&
    normalizeText(invoice.supplierTaxId) !==
      normalizeText(purchaseOrder.supplierTaxId)
  ) {
    issues.push({
      code: "SUPPLIER_TAX_ID_MISMATCH",
      severity: "ERROR",
      field: "supplierTaxId",
      message: "Supplier tax identifiers do not match",
      expected: purchaseOrder.supplierTaxId,
      actual: invoice.supplierTaxId,
    });
  }

  // 4. Compare the invoice subtotal against the PO line-item subtotal.
  const purchaseOrderSubtotalMinor = purchaseOrder.lineItems.reduce(
    (sum, item) => sum + toMinorUnits(item.expectedAmount),
    0,
  );

  if (invoice.subtotal === null) {
    issues.push({
      code: "INVOICE_SUBTOTAL_MISSING",
      severity: "WARNING",
      field: "subtotal",
      message: "Invoice subtotal is missing",
    });
  } else if (
    Math.abs(toMinorUnits(invoice.subtotal) - purchaseOrderSubtotalMinor) > 1
  ) {
    issues.push({
      code: "SUBTOTAL_MISMATCH",
      severity: "ERROR",
      field: "subtotal",
      message: "Invoice subtotal does not match the purchase order subtotal",
      expected: purchaseOrderSubtotalMinor / 100,
      actual: invoice.subtotal,
    });
  }

  // 5. Compare line items by normalized description.
  const matchedPoLineIds = new Set<string>();

  for (const invoiceItem of invoice.lineItems as Array<{
    description: string;
    quantity: number | null;
    unitPrice: number | null;
    amount: number | null;
  }>) {
    const matchingPoItem = purchaseOrder.lineItems.find(
      (poItem) =>
        !matchedPoLineIds.has(poItem.id) &&
        normalizeText(poItem.description) ===
          normalizeText(invoiceItem.description),
    );

    if (!matchingPoItem) {
      issues.push({
        code: "PO_LINE_ITEM_NOT_FOUND",
        severity: "ERROR",
        field: "lineItems",
        message: `Invoice item "${invoiceItem.description}" was not found on the purchase order`,
        actual: invoiceItem.description,
      });

      continue;
    }

    matchedPoLineIds.add(matchingPoItem.id);

    if (invoiceItem.quantity === null || invoiceItem.unitPrice === null) {
      issues.push({
        code: "INVOICE_LINE_ITEM_INCOMPLETE",
        severity: "WARNING",
        field: "lineItems",
        message: `Quantity or unit price is missing for "${invoiceItem.description}"`,
      });

      continue;
    }

    if (
      !approximatelyEqualMoney(invoiceItem.unitPrice, matchingPoItem.unitPrice)
    ) {
      issues.push({
        code: "UNIT_PRICE_MISMATCH",
        severity: "ERROR",
        field: "lineItems",
        message: `Unit price differs for "${invoiceItem.description}"`,
        expected: matchingPoItem.unitPrice.toString(),
        actual: invoiceItem.unitPrice,
      });
    }

    if (
      !approximatelyEqualMoney(invoiceItem.quantity, matchingPoItem.quantity)
    ) {
      issues.push({
        code: "QUANTITY_MISMATCH",
        severity: "ERROR",
        field: "lineItems",
        message: `Quantity differs for "${invoiceItem.description}"`,
        expected: matchingPoItem.quantity.toString(),
        actual: invoiceItem.quantity,
      });
    }
  }

  // 6. Ensure every PO line item was represented on the invoice.
  for (const poItem of purchaseOrder.lineItems) {
    if (!matchedPoLineIds.has(poItem.id)) {
      issues.push({
        code: "PO_LINE_ITEM_MISSING_FROM_INVOICE",
        severity: "WARNING",
        field: "lineItems",
        message: `Purchase order item "${poItem.description}" was not found on the invoice`,
        expected: poItem.description,
      });
    }
  }

  // 7. Compare invoice total with the PO's expected total.
  if (invoice.totalAmount === null) {
    issues.push({
      code: "INVOICE_TOTAL_MISSING",
      severity: "WARNING",
      field: "totalAmount",
      message: "Invoice total is missing",
    });
  } else if (
    !approximatelyEqualMoney(invoice.totalAmount, purchaseOrder.expectedTotal)
  ) {
    issues.push({
      code: "TOTAL_AMOUNT_MISMATCH",
      severity: "ERROR",
      field: "totalAmount",
      message: "Invoice total does not match the purchase order expected total",
      expected: purchaseOrder.expectedTotal.toString(),
      actual: invoice.totalAmount,
    });
  }

  const hasErrors = issues.some((issue) => issue.severity === "ERROR");

  const status = hasErrors ? "MISMATCH" : "MATCHED";

  const match = await prisma.purchaseOrderMatch.upsert({
    where: {
      invoiceId: invoice.id,
    },

    create: {
      invoiceId: invoice.id,
      purchaseOrderId: purchaseOrder.id,
      status,
      issues: issues as Prisma.InputJsonValue,
      matchedAt: new Date(),
    },

    update: {
      purchaseOrderId: purchaseOrder.id,
      status,
      issues: issues as Prisma.InputJsonValue,
      matchedAt: new Date(),
    },
  });

  await prisma.document.update({
    where: {
      id: documentId,
    },

    data: {
      status: hasErrors ? "REVIEW_REQUIRED" : "PO_MATCHED",
    },
  });

  return {
    match,
    purchaseOrder,
    issues,
    status,
  };
}
