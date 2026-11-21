import "dotenv/config";

import { invoiceProcessingGraph } from "./invoice-processing.graph.js";
import prisma from "../../config/prisma.js";

async function testInvoiceProcessing() {
  // Replace this with the ID of an invoice you already uploaded.
  const documentId = "23b6fe16-4721-4ae8-8d12-e6b472c1a521";

  // Use the same thread ID when resuming this workflow later.
  const threadId = `invoice-${documentId}`;

  try {
    console.log("\n====================================");
    console.log("STARTING INVOICE PROCESSING WORKFLOW");
    console.log("====================================");

    console.log("Document ID:", documentId);
    console.log("Thread ID:", threadId);

    // Step 1: Verify that the document exists.
    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
      },
      include: {
        invoice: {
          include: {
            purchaseOrderMatch: true,
          },
        },
      },
    });

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    console.log("\nDocument found:");
    console.log({
      id: document.id,
      filename: document.filename,
      status: document.status,
      invoiceExists: Boolean(document.invoice),
    });

    // Step 2: Invoke LangGraph.
    console.log("\nInvoking LangGraph...");

    const result = await invoiceProcessingGraph.invoke(
      {
        documentId,
      },
      {
        configurable: {
          thread_id: threadId,
        },
      },
    );

    // Step 3: Display the workflow result.
    console.log("\n====================================");
    console.log("LANGGRAPH EXECUTION RESULT");
    console.log("====================================");

    console.dir(result, {
      depth: null,
      colors: true,
    });

    // Step 4: Check whether a review task was created.
    console.log("\nChecking ReviewTask table...");

    const reviewTask = await prisma.reviewTask.findUnique({
      where: {
        threadId,
      },
    });

    if (reviewTask) {
      console.log("\nReview task found!");

      console.dir(reviewTask, {
        depth: null,
        colors: true,
      });
    } else {
      console.log("\nNo ReviewTask found for this thread.");
      console.log("Check the workflow routing and humanReview node.");
    }

    // Step 5: Display the current document status.
    const updatedDocument = await prisma.document.findUnique({
      where: {
        id: documentId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    console.log("\nCurrent document status:");

    console.dir(updatedDocument, {
      depth: null,
      colors: true,
    });

    console.log("\nWorkflow test finished.");
  } catch (error) {
    console.error("\nWorkflow test failed:");

    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testInvoiceProcessing();
