interface FinancialDiscrepancyProps {
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  currency?: string | null;
}

function formatCurrency(value: number | null, currency: string = "INR") {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

export default function FinancialDiscrepancy({
  subtotal,
  taxAmount,
  totalAmount,
  currency = "INR",
}: FinancialDiscrepancyProps) {
  const expectedTotal =
    subtotal !== null && taxAmount !== null ? subtotal + taxAmount : null;

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
      label: "Total",
      extracted: totalAmount,
      expected: expectedTotal,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">
          Financial Comparison
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left font-semibold text-slate-700">
              <th className="pb-3 font-semibold">Field</th>
              <th className="pb-3 font-semibold">Extracted (Invoice)</th>
              <th className="pb-3 font-semibold">Expected (Calculated)</th>
              <th className="pb-3 font-semibold">Result</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isMismatch =
                row.extracted !== null &&
                row.expected !== null &&
                Math.abs(row.extracted - row.expected) > 0.01;

              return (
                <tr
                  key={row.label}
                  className={`transition-colors ${
                    isMismatch ? "bg-rose-50/70" : "hover:bg-slate-50/50"
                  }`}
                >
                  <td className="py-3 font-semibold text-slate-900">
                    {row.label}
                  </td>

                  <td className="py-3 text-slate-700 font-medium">
                    {formatCurrency(row.extracted, currency || "INR")}
                  </td>

                  <td className="py-3 text-slate-700 font-medium">
                    {formatCurrency(row.expected, currency || "INR")}
                  </td>

                  <td className="py-3">
                    {isMismatch ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-rose-600 text-xs">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-rose-600"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Mismatch
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 text-xs">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-emerald-600"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="9 12 11 14 15 10" />
                        </svg>
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
    </div>
  );
}
