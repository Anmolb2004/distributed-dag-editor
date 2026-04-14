import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createWorkflowSchema } from "@/lib/zod/schemas/workflow";

export const GET = withAuth(async (_req, { userId }) => {
  const workflows = await db.workflow.findMany({
    where: { clerkUserId: userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      thumbnail: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { runs: true } },
    },
  });

  return Response.json({ workflows });
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json();
  const data = createWorkflowSchema.parse(body);

  const workflow = await db.workflow.create({
    data: {
      clerkUserId: userId,
      name: data.name,
      description: data.description,
      flowState: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    },
  });

  return Response.json({ workflow }, { status: 201 });
});
