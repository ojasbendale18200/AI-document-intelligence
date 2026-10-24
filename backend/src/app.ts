import express from "express";
import cors from "cors";
import helmet from "helmet";
import documentRoutes from "./routes/document.routes.js";

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

export default app;
