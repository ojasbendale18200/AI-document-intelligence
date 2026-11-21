interface FinancialDiscrepancyProps {
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  validationIssues?: Array<{
    code: string;
    severity: "ERROR" | "WARNING";
    field?: string;
    message: string;
    expected?: number | null;
    actual?: number | null;
  }>;
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function FinancialDiscrepancy({
  subtotal,
  taxAmount,
  totalAmount,
  validationIssues = [],
}: FinancialDiscrepancyProps) {
  const expectedTotal =
    subtotal !== null && taxAmount !== null ? subtotal + taxAmount : null;

  const difference =
    totalAmount !== null && expectedTotal !== null
      ? totalAmount - expectedTotal
      : null;

  const rows = [
    {
      label: "Subtotal",
      extracted: subtotal,
      expected: subtotal,
    },
    {
      label: "Tax (GST)",
      extracted: taxAmount,
      expected: taxAmount,
    },
    {
      label: "Invoice Total",
      extracted: totalAmount,
      expected: expectedTotal,
    },
  ];

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Financial Discrepancy</h2>

        <p className="mt-1 text-sm text-gray-500">
          Compare extracted invoice amounts with calculated amounts.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3">Field</th>
              <th className="pb-3">Extracted</th>
              <th className="pb-3">Expected</th>
              <th className="pb-3">Result</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isMismatch =
                row.extracted !== null &&
                row.expected !== null &&
                Math.abs(row.extracted - row.expected) > 0.01;

              return (
                <tr key={row.label} className="border-b">
                  <td className="py-4 font-medium">{row.label}</td>

                  <td className="py-4">{formatCurrency(row.extracted)}</td>

                  <td className="py-4">{formatCurrency(row.expected)}</td>

                  <td className="py-4">
                    {isMismatch ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                        Mismatch
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                        Match
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {difference !== null && difference !== 0 && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Financial discrepancy detected
          </p>

          <p className="mt-2 text-2xl font-bold text-red-800">
            {formatCurrency(Math.abs(difference))}
          </p>

          <p className="mt-1 text-sm text-red-600">
            The extracted invoice total does not match the calculated total.
          </p>
        </div>
      )}

      {validationIssues.length > 0 && (
        <div className="mt-5 space-y-3">
          <h3 className="font-semibold">Validation Issues</h3>

          {validationIssues.map((issue, index) => (
            <div
              key={`${issue.code}-${index}`}
              className="rounded-lg border border-amber-200 bg-amber-50 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{issue.code}</span>

                <span className="text-xs font-semibold text-amber-700">
                  {issue.severity}
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-700">{issue.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
