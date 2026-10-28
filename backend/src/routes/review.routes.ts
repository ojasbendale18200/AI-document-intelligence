import { Router } from "express";

import prisma from "../config/prisma.js";

const router = Router();

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

export default router;
