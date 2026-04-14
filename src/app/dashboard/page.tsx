import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { ensureSampleWorkflow } from "@/lib/seed-user-workflow";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Auto-seed the sample workflow for first-time users
  await ensureSampleWorkflow(userId);

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

  return <DashboardClient initialWorkflows={workflows} />;
}
