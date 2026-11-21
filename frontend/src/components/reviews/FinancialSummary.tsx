interface FinancialSummaryProps {
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  currency?: string | null;
}

export default function FinancialSummary({
  subtotal,
  taxAmount,
  totalAmount,
  currency = "INR",
}: FinancialSummaryProps) {
  function formatAmount(value: number | null) {
    if (value === null) return "N/A";

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
    }).format(value);
  }

  const items = [
    {
      label: "Subtotal",
      value: subtotal,
    },
    {
      label: "Tax Amount",
      value: taxAmount,
    },
    {
      label: "Invoice Total",
      value: totalAmount,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">{item.label}</p>

          <p className="mt-2 text-xl font-bold text-gray-900">
            {formatAmount(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
