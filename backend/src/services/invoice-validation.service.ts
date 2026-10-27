import type { InvoiceExtraction } from "../validators/invoice.validator.js";

export type ValidationSeverity = "ERROR" | "WARNING";

export type ValidationIssue = {
  code: string;
  severity: ValidationSeverity;
  field: string;
  message: string;
  expected?: number | string | null;
  actual?: number | string | null;
};

export type InvoiceValidationResult = {
  passed: boolean;
  decision: "AUTO_ELIGIBLE" | "REVIEW_REQUIRED";
  issues: ValidationIssue[];
  checks: {
    lineItems: "PASS" | "FAIL" | "SKIPPED";
    subtotal: "PASS" | "FAIL" | "SKIPPED";
    tax: "PASS" | "FAIL" | "SKIPPED";
    total: "PASS" | "FAIL" | "SKIPPED";
    requiredFields: "PASS" | "FAIL";
  };
};

function toMinorUnits(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const scaled = value * 100;

  if (!Number.isSafeInteger(Math.round(scaled))) {
    return null;
  }

  return Math.round(scaled);
}

function minorUnitsToAmount(value: number): number {
  return value / 100;
}

function approximatelyEqual(
  actual: number,
  expected: number,
  toleranceInMinorUnits = 1,
): boolean {
  const actualMinor = toMinorUnits(actual);
  const expectedMinor = toMinorUnits(expected);

  if (actualMinor === null || expectedMinor === null) {
    return false;
  }

  return Math.abs(actualMinor - expectedMinor) <= toleranceInMinorUnits;
}

export function validateInvoice(
  invoice: InvoiceExtraction,
): InvoiceValidationResult {
  const issues: ValidationIssue[] = [];

  let lineItemsCheck: "PASS" | "FAIL" | "SKIPPED" = "SKIPPED";
  let subtotalCheck: "PASS" | "FAIL" | "SKIPPED" = "SKIPPED";
  let taxCheck: "PASS" | "FAIL" | "SKIPPED" = "SKIPPED";
  let totalCheck: "PASS" | "FAIL" | "SKIPPED" = "SKIPPED";
  let requiredFieldsCheck: "PASS" | "FAIL" = "PASS";

  // 1. Check required business fields.
  const requiredFields: Array<keyof InvoiceExtraction> = [
    "invoiceNumber",
    "invoiceDate",
    "supplierName",
    "customerName",
    "currency",
  ];

  for (const field of requiredFields) {
    const value = invoice[field];

    if (typeof value !== "string" || value.trim() === "") {
      requiredFieldsCheck = "FAIL";

      issues.push({
        code: "REQUIRED_FIELD_MISSING",
        severity: "WARNING",
        field,
        message: `${field} is missing or empty`,
      });
    }
  }

  // 2. Validate line items.
  const completeLineItems = invoice.lineItems.filter(
    (item) =>
      item.quantity !== null && item.unitPrice !== null && item.amount !== null,
  );

  const incompleteLineItems = invoice.lineItems.filter(
    (item) =>
      item.quantity === null || item.unitPrice === null || item.amount === null,
  );

  if (invoice.lineItems.length === 0) {
    issues.push({
      code: "NO_LINE_ITEMS",
      severity: "WARNING",
      field: "lineItems",
      message: "No line items were extracted",
    });
  } else if (incompleteLineItems.length > 0) {
    issues.push({
      code: "INCOMPLETE_LINE_ITEMS",
      severity: "WARNING",
      field: "lineItems",
      message: "Some line items have missing quantities or amounts",
    });
  }

  let lineItemsValid = true;

  for (const item of completeLineItems) {
    if (item.quantity! < 0 || item.unitPrice! < 0 || item.amount! < 0) {
      lineItemsValid = false;

      issues.push({
        code: "NEGATIVE_LINE_ITEM_VALUE",
        severity: "ERROR",
        field: "lineItems",
        message: `Negative values found in line item "${item.description}"`,
      });

      continue;
    }

    const expectedAmount = item.quantity! * item.unitPrice!;

    if (!approximatelyEqual(item.amount!, expectedAmount)) {
      lineItemsValid = false;

      issues.push({
        code: "LINE_ITEM_AMOUNT_MISMATCH",
        severity: "ERROR",
        field: "lineItems",
        message: `Amount does not match quantity × unit price for "${item.description}"`,
        expected: Number(expectedAmount.toFixed(2)),
        actual: item.amount,
      });
    }
  }

  if (invoice.lineItems.length > 0) {
    lineItemsCheck = lineItemsValid ? "PASS" : "FAIL";
  }

  // Do not calculate totals from incomplete line items.
  const canCalculateSubtotal =
    invoice.lineItems.length > 0 &&
    incompleteLineItems.length === 0 &&
    lineItemsValid;

  let calculatedSubtotalMinor: number | null = null;

  if (canCalculateSubtotal) {
    const amountsMinor = completeLineItems.map((item) =>
      toMinorUnits(item.amount!),
    );

    if (amountsMinor.every((amount) => amount !== null)) {
      calculatedSubtotalMinor = amountsMinor.reduce(
        (sum, amount) => sum + amount!,
        0,
      );
    }
  }

  // 3. Compare calculated subtotal with the extracted subtotal.
  if (calculatedSubtotalMinor !== null && invoice.subtotal !== null) {
    const extractedSubtotalMinor = toMinorUnits(invoice.subtotal);

    if (extractedSubtotalMinor === null) {
      subtotalCheck = "FAIL";

      issues.push({
        code: "INVALID_SUBTOTAL",
        severity: "ERROR",
        field: "subtotal",
        message: "Subtotal is outside the supported numeric range",
      });
    } else if (Math.abs(calculatedSubtotalMinor - extractedSubtotalMinor) > 1) {
      subtotalCheck = "FAIL";

      issues.push({
        code: "SUBTOTAL_MISMATCH",
        severity: "ERROR",
        field: "subtotal",
        message: "Subtotal does not match the sum of line-item amounts",
        expected: minorUnitsToAmount(calculatedSubtotalMinor),
        actual: invoice.subtotal,
      });
    } else {
      subtotalCheck = "PASS";
    }
  }

  // 4. Validate the tax calculation if the necessary values exist.
  const canCalculateTax =
    invoice.subtotal !== null &&
    invoice.taxRatePercent !== null &&
    invoice.taxAmount !== null;

  if (canCalculateTax) {
    const subtotalMinor = toMinorUnits(invoice.subtotal!);
    const taxMinor = toMinorUnits(invoice.taxAmount!);
    const taxRate = invoice.taxRatePercent!;

    if (
      subtotalMinor === null ||
      taxMinor === null ||
      !Number.isFinite(taxRate) ||
      taxRate < 0 ||
      taxRate > 100
    ) {
      taxCheck = "FAIL";

      issues.push({
        code: "INVALID_TAX_VALUES",
        severity: "ERROR",
        field: "taxAmount",
        message: "Tax values are outside supported limits",
      });
    } else {
      const expectedTaxMinor = Math.round(subtotalMinor * (taxRate / 100));

      if (Math.abs(expectedTaxMinor - taxMinor) > 1) {
        taxCheck = "FAIL";

        issues.push({
          code: "TAX_AMOUNT_MISMATCH",
          severity: "ERROR",
          field: "taxAmount",
          message: "Tax amount does not match subtotal × tax rate",
          expected: minorUnitsToAmount(expectedTaxMinor),
          actual: invoice.taxAmount,
        });
      } else {
        taxCheck = "PASS";
      }
    }
  }

  // 5. Validate the total when subtotal and tax are available.
  if (
    invoice.subtotal !== null &&
    invoice.taxAmount !== null &&
    invoice.totalAmount !== null
  ) {
    const subtotalMinor = toMinorUnits(invoice.subtotal);
    const taxMinor = toMinorUnits(invoice.taxAmount);
    const totalMinor = toMinorUnits(invoice.totalAmount);

    if (subtotalMinor === null || taxMinor === null || totalMinor === null) {
      totalCheck = "FAIL";

      issues.push({
        code: "INVALID_TOTAL_VALUES",
        severity: "ERROR",
        field: "totalAmount",
        message: "Invoice totals are outside the supported numeric range",
      });
    } else {
      const expectedTotalMinor = subtotalMinor + taxMinor;

      if (Math.abs(expectedTotalMinor - totalMinor) > 1) {
        totalCheck = "FAIL";

        issues.push({
          code: "TOTAL_AMOUNT_MISMATCH",
          severity: "ERROR",
          field: "totalAmount",
          message: "Total does not match subtotal plus tax",
          expected: minorUnitsToAmount(expectedTotalMinor),
          actual: invoice.totalAmount,
        });
      } else {
        totalCheck = "PASS";
      }
    }
  }

  // 6. Any unresolved or failed check means manual review is required.
  const hasError = issues.some((issue) => issue.severity === "ERROR");

  const hasWarning = issues.some((issue) => issue.severity === "WARNING");

  const allFinancialChecksPassed =
    lineItemsCheck === "PASS" &&
    subtotalCheck === "PASS" &&
    taxCheck === "PASS" &&
    totalCheck === "PASS";

  const passed =
    !hasError &&
    !hasWarning &&
    requiredFieldsCheck === "PASS" &&
    allFinancialChecksPassed;

  return {
    passed,
    decision: passed ? "AUTO_ELIGIBLE" : "REVIEW_REQUIRED",
    issues,
    checks: {
      lineItems: lineItemsCheck,
      subtotal: subtotalCheck,
      tax: taxCheck,
      total: totalCheck,
      requiredFields: requiredFieldsCheck,
    },
  };
}
