import { Router } from "express";

import prisma from "../config/prisma.js";
import { Command } from "@langchain/langgraph";
import { invoiceProcessingGraph } from "../workflows/invoice-processing/invoice-processing.graph.js";
import { reviewDecisionSchema } from "../validators/review.validator.js";
import { createAuditLog } from "../services/audit.service.js";

const router = Router();

// GET /api/reviews/counts
router.get("/counts", async (_req, res, next) => {
  try {
    const [pending, inProgress, resolved] = await Promise.all([
      prisma.reviewTask.count({ where: { status: "PENDING" } }),
      prisma.reviewTask.count({ where: { status: "IN_PROGRESS" } }),
      prisma.reviewTask.count({ where: { status: "RESOLVED" } }),
    ]);

    res.status(200).json({
      PENDING: pending,
      IN_PROGRESS: inProgress,
      RESOLVED: resolved,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reviews?status=PENDING
router.get("/", async (req, res, next) => {
  try {
    const requestedStatus =
      typeof req.query.status === "string" ? req.query.status : "PENDING";

    const allowedStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED"];

    if (!allowedStatuses.includes(requestedStatus)) {
      res.status(400).json({
        error: "Invalid review status.",
        allowedStatuses,
      });

      return;
    }

    const tasks = await prisma.reviewTask.findMany({
      where: {
        status: requestedStatus,
      },

      include: {
        document: {
          include: {
            invoice: true,
          },
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    });

    res.status(200).json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reviews/:id
router.get("/:id", async (req, res, next) => {
  try {
    const task = await prisma.reviewTask.findUnique({
      where: {
        id: req.params.id,
      },

      include: {
        document: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({
        error: "Review task not found.",
      });

      return;
    }

    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews/:id/decision
router.post("/:id/decision", async (req, res, next) => {
  try {
    // 1. Validate the request body.
    const parsed = reviewDecisionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid review decision.",
        details: parsed.error.issues,
      });

      return;
    }

    const { decision, comment } = parsed.data;
    const reviewTaskId = req.params.id;

    // 2. Find the review task.
    const existingTask = await prisma.reviewTask.findUnique({
      where: {
        id: reviewTaskId,
      },
    });

    if (!existingTask) {
      res.status(404).json({
        error: "Review task not found.",
      });

      return;
    }

    // 3. Prevent an already-resolved task from being decided again.
    if (existingTask.status === "RESOLVED") {
      res.status(409).json({
        error: "This review task has already been resolved.",
      });

      return;
    }

    // This example accepts only new, pending tasks.
    if (existingTask.status !== "PENDING") {
      res.status(409).json({
        error: "This review task is not currently pending.",
        currentStatus: existingTask.status,
      });

      return;
    }

    // 4. Atomically claim the pending task and save the decision.
    const claimed = await prisma.reviewTask.updateMany({
      where: {
        id: reviewTaskId,
        status: "PENDING",
      },

      data: {
        status: "IN_PROGRESS",
        decision,
        reviewerComment: comment ?? null,
      },
    });

    // Another request might have claimed the task first.
    if (claimed.count !== 1) {
      res.status(409).json({
        error: "This review task has already been claimed or updated.",
      });

      return;
    }

    // 5. Use the thread ID saved on the review task.
    const config = {
      configurable: {
        thread_id: existingTask.threadId,
      },
    };

    // 6. Resume the interrupted LangGraph workflow.
    let workflowResult;

    try {
      workflowResult = await invoiceProcessingGraph.invoke(
        new Command({
          resume: {
            decision,
            comment,
          },
        }),
        config,
      );
    } catch (error) {
      // The decision is already saved.
      // Leave the task IN_PROGRESS so the failure can be recovered.
      console.error(
        "Review decision was saved, but workflow resumption failed:",
        error,
      );

      res.status(503).json({
        error:
          "The decision was saved, but the workflow could not be resumed. Recovery is required.",
        reviewTaskId,
        status: "IN_PROGRESS",
      });

      return;
    }

    // 7. Map the review decision to the document's business status.
    const documentStatus =
      decision === "APPROVE"
        ? "APPROVED"
        : decision === "REJECT"
          ? "REJECTED"
          : "CORRECTION_REQUIRED";

    // 8. Save the final result to both application records.
    const updatedTask = await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: {
          id: existingTask.documentId,
        },

        data: {
          status: documentStatus,
        },
      });

      return tx.reviewTask.update({
        where: {
          id: reviewTaskId,
        },

        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });
    });

    await createAuditLog({
      documentId: existingTask.documentId,

      action: `REVIEW_${decision}`,

      entityType: "REVIEW_TASK",

      entityId: existingTask.id,

      actorType: "USER",

      actorId: null,

      description: `Invoice review decision: ${decision}`,

      metadata: {
        decision,
        comment,
      },
    });

    // 9. Return the final response.
    res.status(200).json({
      message: "Review decision processed successfully.",

      reviewTask: updatedTask,

      documentStatus,

      workflowResult,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
