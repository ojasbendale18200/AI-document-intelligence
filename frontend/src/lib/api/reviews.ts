import { ReviewCountsResponse, ReviewDecisionPayload, ReviewQueueResponse, ReviewTask } from "@/src/types/review";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();

    return (
      body.error ??
      body.message ??
      `Request failed with status ${response.status}`
    );
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function getReviews(
  status = "PENDING",
): Promise<ReviewQueueResponse> {
  const params = new URLSearchParams({ status });

  const response = await fetch(
    `${API_BASE_URL}/api/reviews?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function getReviewCounts(): Promise<ReviewCountsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/reviews/counts`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function getReviewById(id: string): Promise<ReviewTask> {
  const response = await fetch(
    `${API_BASE_URL}/api/reviews/${encodeURIComponent(id)}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function submitReviewDecision(
  id: string,
  payload: ReviewDecisionPayload,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/reviews/${encodeURIComponent(id)}/decision`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}
