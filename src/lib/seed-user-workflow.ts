import { db } from "@/lib/db";

const SAMPLE_WORKFLOW_NAME = "Product Marketing Kit Generator";
const SAMPLE_DESCRIPTION =
  "Demonstrates all 6 node types with parallel execution branches and a convergence point. Upload a product image and demo video to generate marketing copy.";

/**
 * Ensure the user has at least one workflow.
 * If not, clone the sample workflow template (or create a fresh one).
 */
export async function ensureSampleWorkflow(clerkUserId: string) {
  const count = await db.workflow.count({ where: { clerkUserId } });
  if (count > 0) return;

  // Try to clone from seed template
  const template = await db.workflow.findFirst({
    where: { name: SAMPLE_WORKFLOW_NAME, clerkUserId: "SEED_TEMPLATE" },
  });

  if (template) {
    await db.workflow.create({
      data: {
        clerkUserId,
        name: template.name,
        description: template.description,
        flowState: template.flowState ?? {},
      },
    });
    return;
  }

  // Fallback: create inline sample workflow
  const { getSampleFlowState } = await import("./sample-workflow");
  await db.workflow.create({
    data: {
      clerkUserId,
      name: SAMPLE_WORKFLOW_NAME,
      description: SAMPLE_DESCRIPTION,
      flowState: getSampleFlowState(),
    },
  });
}
