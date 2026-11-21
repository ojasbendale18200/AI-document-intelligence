import prisma from "../config/prisma.js";
import type { Prisma } from "@prisma/client";

interface CreateAuditLogInput {
  documentId?: string | null;

  action: string;

  entityType: string;

  entityId?: string | null;

  actorType?: string;

  actorId?: string | null;

  description: string;

  metadata?: Record<string, unknown>;
}

export async function createAuditLog(data: CreateAuditLogInput) {
  const auditLog = await prisma.auditLog.create({
    data: {
      documentId: data.documentId ?? null,

      action: data.action,

      entityType: data.entityType,

      entityId: data.entityId ?? null,

      actorType: data.actorType ?? "SYSTEM",

      actorId: data.actorId ?? null,

      description: data.description,

      metadata: data.metadata
        ? (data.metadata as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return auditLog;
}
