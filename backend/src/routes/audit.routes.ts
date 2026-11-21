import { Router } from "express";

import prisma from "../config/prisma.js";

const router = Router();

// GET /api/audit-logs/documents/:documentId
router.get("/documents/:documentId", async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
      },
      select: {
        id: true,
      },
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        documentId,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      count: auditLogs.length,
      logs: auditLogs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
