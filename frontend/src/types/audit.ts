export interface AuditLog {
  id: string;

  documentId: string | null;

  action: string;

  entityType: string;

  entityId: string | null;

  actorType: string;

  actorId: string | null;

  description: string;

  metadata: Record<string, unknown> | null;

  createdAt: string;
}

export interface AuditLogResponse {
  count: number;
  logs: AuditLog[];
}
