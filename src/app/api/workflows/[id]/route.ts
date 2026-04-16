import { z } from "zod";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { ApiError } from "@/lib/api/errors";
import { updateWorkflowSchema } from "@/lib/zod/schemas/workflow";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export const GET = withAuth(async (_req, { userId, params }) => {
  const { id } = paramsSchema.parse(params);
  const workflow = await db.workflow.findFirst({
    where: { id, clerkUserId: userId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 50,
        include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
      },
    },
  });

  if (!workflow) throw new ApiError("NOT_FOUND", "Workflow not found");

  return Response.json({ workflow });
});

export const PATCH = withAuth(async (req, { userId, params }) => {
  const { id } = paramsSchema.parse(params);
  const existing = await db.workflow.findFirst({
    where: { id, clerkUserId: userId },
  });
  if (!existing) throw new ApiError("NOT_FOUND", "Workflow not found");

  const body = await req.json();
  const data = updateWorkflowSchema.parse(body);

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.flowState !== undefined) updateData.flowState = data.flowState as unknown;

  const workflow = await db.workflow.update({
    where: { id },
    data: updateData as Parameters<typeof db.workflow.update>[0]["data"],
  });

  return Response.json({ workflow });
});

export const DELETE = withAuth(async (_req, { userId, params }) => {
  const { id } = paramsSchema.parse(params);
  const existing = await db.workflow.findFirst({
    where: { id, clerkUserId: userId },
  });
  if (!existing) throw new ApiError("NOT_FOUND", "Workflow not found");

  await db.workflow.delete({ where: { id } });

  return Response.json({ success: true });
});
