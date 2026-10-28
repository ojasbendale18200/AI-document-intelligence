import express from "express";
import cors from "cors";
import helmet from "helmet";
import documentRoutes from "./routes/document.routes.js";
import extractionRoutes from "./routes/extraction.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import validationRoutes from "./routes/validation.routes.js";
import purchaseOrderRoutes from "./routes/purchase-order.routes.js";
import matchingRoutes from "./routes/matching.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Document Intelligence API is running",
  });
});

app.use("/api/documents", documentRoutes);
app.use("/api/documents", extractionRoutes);
app.use("/api/documents", invoiceRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/documents", matchingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/documents", validationRoutes);

app.use(errorHandler);

export default app;
