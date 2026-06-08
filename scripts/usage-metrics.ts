/**
 * One-off script: prints aggregate usage stats from the database (users with workflows/runs and last activity).
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

let db: any = null;

async function getDb() {
  const mod = await import("@/lib/db");
  return mod.db;
}

async function main() {
  db = await getDb();

  const [
    totalUsersWithWorkflows,
    totalUsersWithRuns,
    totalUsersWhoUsedApp,
    lastRun,
  ] =
    await Promise.all([
      db.workflow
        .findMany({
          select: { clerkUserId: true },
          distinct: ["clerkUserId"],
        })
        .then((rows) => rows.length),
      db.workflowRun
        .findMany({
          select: { clerkUserId: true },
          distinct: ["clerkUserId"],
        })
        .then((rows) => rows.length),
      db.$queryRaw<{ clerkUserId: string }[]>`
        select distinct "clerkUserId"
        from (
          select "clerkUserId" from workflows
          union
          select "clerkUserId" from workflow_runs
        ) t
      `.then((rows) => rows.length),
      db.workflowRun.findFirst({
        orderBy: { startedAt: "desc" },
        select: { startedAt: true, clerkUserId: true, workflowId: true, status: true },
      }),
    ]);

  const lastUsedAt = lastRun?.startedAt ?? null;

  // Keep output simple so it's easy to copy/paste.
  console.log(
    JSON.stringify(
      {
        totalUsersWithWorkflows,
        totalUsersWithRuns,
        totalUsersWhoUsedApp,
        lastUsedAt,
        lastRun,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db?.$disconnect();
  });

