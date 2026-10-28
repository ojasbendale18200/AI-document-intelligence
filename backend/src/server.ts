import "dotenv/config";

import app from "./app.js";
import { initializeCheckpointer } from "./config/langgraph-checkpointer.js";

const PORT = Number(process.env.PORT ?? 5000);

async function startServer() {
  await initializeCheckpointer();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  process.on("SIGINT", () => {
    server.close(() => {
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
