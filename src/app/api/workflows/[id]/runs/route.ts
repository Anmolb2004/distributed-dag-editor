import { z } from "zod";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { ApiError } from "@/lib/api/errors";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export const GET = withAuth(async (_req, { userId, params }) => {
  const { id } = paramsSchema.parse(params);

  // Verify the workflow belongs to the authenticated user
  const workflow = await db.workflow.findFirst({
    where: { id, clerkUserId: userId },
  });
  if (!workflow) throw new ApiError("NOT_FOUND", "Workflow not found");

  const runs = await db.workflowRun.findMany({
    where: { workflowId: id, clerkUserId: userId },
    orderBy: { startedAt: "desc" },
    take: 50,
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  });

  return Response.json({ runs });
});
