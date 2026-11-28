import { Router } from "express";

import prisma from "../config/prisma.js";

const router = Router();

// GET /api/documents/:documentId/processing-history

router.get("/:documentId/processing-history", async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
      },

      select: {
        id: true,
        filename: true,
        status: true,
      },
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    const steps = await prisma.documentProcessingStep.findMany({
      where: {
        documentId,
      },

      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      documentId,
      currentStatus: document.status,
      count: steps.length,
      steps,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
