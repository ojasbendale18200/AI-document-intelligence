"use client";

import { useState } from "react";

import { submitReviewDecision } from "@/src/lib/api/reviews";

import type { ReviewDecision } from "@/src/types/review";

interface ReviewDecisionPanelProps {
  reviewTaskId: string;
  onSuccess: () => void;
}

export default function ReviewDecisionPanel({
  reviewTaskId,
  onSuccess,
}: ReviewDecisionPanelProps) {
  const [decision, setDecision] = useState<ReviewDecision>("REJECT");

  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const requiresComment =
    decision === "REJECT" || decision === "CORRECT";

  async function handleSubmit() {
    setError(null);

    if (requiresComment && !comment.trim()) {
      setError(
        "A comment is required when rejecting or requesting correction.",
      );

      return;
    }

    setLoading(true);

    try {
      await submitReviewDecision(reviewTaskId, {
        decision,
        comment: comment.trim() || undefined,
      });

      onSuccess();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to submit the decision.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="decision-panel">
      <h2>Review Decision</h2>
      <p className="decision-subtitle">
        Choose an action and provide a comment where required.
      </p>

      <div className="decision-options">
        {/* Approve Option */}
        <button
          type="button"
          onClick={() => setDecision("APPROVE")}
          className={`decision-option decision-option--approve ${
            decision === "APPROVE" ? "decision-option--selected" : ""
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          Approve
        </button>

        {/* Reject Option */}
        <button
          type="button"
          onClick={() => setDecision("REJECT")}
          className={`decision-option decision-option--reject ${
            decision === "REJECT" ? "decision-option--selected" : ""
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
          Reject
        </button>

        {/* Request Correction Option */}
        <button
          type="button"
          onClick={() => setDecision("CORRECT")}
          className={`decision-option decision-option--correct ${
            decision === "CORRECT" ? "decision-option--selected" : ""
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
          Request Correction
        </button>
      </div>

      <label className="decision-comment-label">
        Review Comment {requiresComment && <span className="required-star">*</span>}
      </label>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Invoice total is incorrect. The total should be ₹16,166.00 (₹13,700 + ₹2,466)."
        className="decision-textarea"
      />

      <div className="decision-char-count">
        {comment.length} / 2000
      </div>

      {error && <p className="decision-error">{error}</p>}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={loading}
        className="decision-submit"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        {loading ? "Submitting..." : "Submit Decision"}
      </button>
    </div>
  );
}