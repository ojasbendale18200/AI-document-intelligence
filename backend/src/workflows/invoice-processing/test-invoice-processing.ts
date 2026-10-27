import { invoiceProcessingGraph } from "./invoice-processing.graph.js";

async function main() {
  const documentId = "93089e0c-16f4-4c54-b47f-4254a1708e1c"

  if (!documentId) {
    throw new Error("Please provide a document ID.");
  }

  const result = await invoiceProcessingGraph.invoke({
    documentId,
  });

  console.log("\nFinal workflow result:");

  console.dir(result, {
    depth: null,
  });
}

main().catch((error) => {
  console.error("Workflow invocation failed:", error);
  process.exitCode = 1;
});
