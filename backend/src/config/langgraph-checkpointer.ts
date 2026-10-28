import "dotenv/config";

import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import prisma from "./prisma.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing from the environment variables.");
}

export const invoiceCheckpointer = PostgresSaver.fromConnString(databaseUrl, {
  schema: "langgraph",
});

let initialized = false;

export async function initializeCheckpointer(): Promise<void> {
  if (initialized) {
    return;
  }

  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS langgraph;`);

  await invoiceCheckpointer.setup();

  initialized = true;

  console.log("LangGraph PostgreSQL checkpointer initialized in 'langgraph' schema.");
}
