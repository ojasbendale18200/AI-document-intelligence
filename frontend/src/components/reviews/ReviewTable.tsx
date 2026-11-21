"use client";

import Link from "next/link";

import ReviewStatusBadge from "./ReviewStatusBadge";
import { ReviewTask } from "@/src/types/review";

interface ReviewTableProps {
  tasks: ReviewTask[];
}

function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  const date = new Date(iso);

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) +
    "\n" +
    date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
}

export default function ReviewTable({ tasks }: ReviewTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <h2>No review tasks found</h2>
        <p>There are no tasks matching this filter.</p>
      </div>
    );
  }

  return (
    <div className="review-table-wrap">
      <table className="review-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Supplier</th>
            <th>Amount</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {tasks.map((task) => {
            const invoice = task.document.invoice;

            return (
              <tr key={task.id}>
                <td className="review-table-invoice">
                  {invoice?.invoiceNumber ?? "Unknown"}
                </td>

                <td>{invoice?.supplierName ?? "Unknown"}</td>

                <td>
                  {formatMoney(
                    invoice?.totalAmount ?? null,
                    invoice?.currency ?? null,
                  )}
                </td>

                <td>
                  <div className="review-table-reason-title">
                    {task.reasonCode.replaceAll("_", " ")}
                  </div>
                  <p className="review-table-reason-text">{task.reason}</p>
                </td>

                <td>
                  <ReviewStatusBadge status={task.status} />
                </td>

                <td className="review-table-date">
                  {formatDate(task.createdAt)}
                </td>

                <td>
                  <Link href={`/reviews/${task.id}`} className="review-btn">
                    Review →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
