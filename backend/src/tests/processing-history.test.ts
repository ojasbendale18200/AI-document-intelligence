import prisma from "../config/prisma.js";

import {
  startProcessingStep,
  completeProcessingStep,
  failProcessingStep,
  skipProcessingStep,
} from "../services/processing-history.service.js";

async function testProcessingHistory() {
  try {
    const document = await prisma.document.findFirst();

    if (!document) {
      throw new Error("Upload a document before running this test");
    }

    // 1. Start PDF extraction
    const pdfStep = await startProcessingStep({
      documentId: document.id,
      stepName: "PDF_EXTRACTION",
      message: "Starting PDF extraction",
    });

    console.log("PDF extraction started:", pdfStep.id);

    // Simulate successful processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. Complete PDF extraction
    const completedPdf = await completeProcessingStep({
      stepId: pdfStep.id,
      message: "PDF text extracted successfully",
    });

    console.log("PDF extraction completed:", completedPdf);

    // 3. Start AI extraction
    const aiStep = await startProcessingStep({
      documentId: document.id,
      stepName: "AI_EXTRACTION",
      message: "Starting AI extraction",
    });

    // Simulate a failure
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. Fail AI extraction
    const failedAi = await failProcessingStep({
      stepId: aiStep.id,
      error: "Simulated OpenAI timeout",
      message: "AI extraction failed",
    });

    console.log("AI extraction failed:", failedAi);

    // 5. Skip PO matching
    const skippedPo = await skipProcessingStep({
      documentId: document.id,
      stepName: "PO_MATCHING",
      message: "Skipped because AI extraction failed",
    });

    console.log("PO matching skipped:", skippedPo);
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testProcessingHistory();
