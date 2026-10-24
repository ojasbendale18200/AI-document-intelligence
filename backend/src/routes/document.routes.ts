import { Router } from "express";
import prisma from "../config/prisma.js";


const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
