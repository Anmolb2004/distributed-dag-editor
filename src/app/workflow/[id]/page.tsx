import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { WorkflowEditor } from "@/components/editor/workflow-editor";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
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

  if (!workflow) redirect("/dashboard");

  return <WorkflowEditor workflow={workflow} />;
}
