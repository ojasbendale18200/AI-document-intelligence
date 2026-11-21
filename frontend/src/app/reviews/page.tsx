"use client";

import { useCallback, useEffect, useState } from "react";

import ReviewTable from "@/src/components/reviews/ReviewTable";

import { getReviews, getReviewCounts } from "@/src/lib/api/reviews";

import type {
  ReviewCountsResponse,
  ReviewQueueResponse,
  ReviewStatus,
} from "@/src/types/review";

const FILTERS: ReviewStatus[] = ["PENDING", "IN_PROGRESS", "RESOLVED"];

export default function ReviewsPage() {
  const [status, setStatus] = useState<ReviewStatus>("PENDING");

  const [data, setData] = useState<ReviewQueueResponse | null>(null);

  const [counts, setCounts] = useState<ReviewCountsResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [result, countsResult] = await Promise.all([
        getReviews(status),
        getReviewCounts(),
      ]);

      setData(result);
      setCounts(countsResult);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load review tasks.",
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  return (
    <>
      <header style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#6b7280",
            marginBottom: 6,
          }}
        >
          Accounts Payable
        </p>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 4px",
          }}
        >
          Invoice Review Center
        </h1>

        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
          Review invoice discrepancies and manage pending decisions.
        </p>
      </header>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--pending">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <div>
            <div className="stat-card-label">Pending Reviews</div>
            <div className="stat-card-value">
              {counts?.PENDING ?? "—"}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--in-progress">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>

          <div>
            <div className="stat-card-label">In Progress</div>
            <div className="stat-card-value">
              {counts?.IN_PROGRESS ?? "—"}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon--resolved">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <div>
            <div className="stat-card-label">Resolved</div>
            <div className="stat-card-value">
              {counts?.RESOLVED ?? "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs + Refresh */}
      <div className="filter-bar">
        <div className="filter-tabs">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatus(filter)}
              className={`filter-tab ${status === filter ? "filter-tab--active" : ""}`}
            >
              {filter.replace("_", " ")}
              {counts
                ? ` (${counts[filter]})`
                : ""}
            </button>
          ))}
        </div>

        <button
          onClick={() => void loadReviews()}
          disabled={loading}
          className="refresh-btn"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && <div className="error-alert">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="loading-state">Loading review tasks...</div>
      ) : error ? (
        <div className="loading-state">Could not load the review queue.</div>
      ) : (
        <ReviewTable tasks={data?.tasks ?? []} />
      )}
    </>
  );
}