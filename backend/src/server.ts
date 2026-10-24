import "dotenv/config";
import app from "./app.js";

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down server...`);

  server.close((error) => {
    if (error) {
      console.error("Error while closing the server:", error);
      process.exitCode = 1;
      return;
    }

    console.log("Server closed successfully.");
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
