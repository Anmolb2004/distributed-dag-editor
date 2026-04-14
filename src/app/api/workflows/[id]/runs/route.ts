import { db } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { ApiError } from "@/lib/api/errors";

export const GET = withAuth(async (_req, { userId, params }) => {
  const workflow = await db.workflow.findFirst({
    where: { id: params.id, clerkUserId: userId },
  });
  if (!workflow) throw new ApiError("NOT_FOUND", "Workflow not found");

  const runs = await db.workflowRun.findMany({
    where: { workflowId: params.id },
    orderBy: { startedAt: "desc" },
    take: 50,
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  });

  return Response.json({ runs });
});
