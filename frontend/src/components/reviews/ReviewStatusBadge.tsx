import { ReviewStatus } from "@/src/types/review";

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
}

const STYLE_MAP: Record<ReviewStatus, string> = {
  PENDING: "status-badge--pending",
  IN_PROGRESS: "status-badge--in-progress",
  RESOLVED: "status-badge--resolved",
};

export default function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  return (
    <span className={`status-badge ${STYLE_MAP[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}
