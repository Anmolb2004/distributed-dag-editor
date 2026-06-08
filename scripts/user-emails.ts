/**
 * One-off script: lists Clerk user ids that appear in workflows/runs and prints primary emails from Clerk where available.
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

let db: any = null;

async function getDb() {
  const mod = await import("@/lib/db");
  return mod.db;
}

async function getClerkClient() {
  const mod = await import("@clerk/nextjs/server");
  // `clerkClient` is an async helper in recent Clerk versions.
  return await mod.clerkClient();
}

async function main() {
  db = await getDb();
  const clerk = await getClerkClient();

  const allIds = await db.$queryRaw<{ clerkUserId: string }[]>`
    select distinct "clerkUserId"
    from (
      select "clerkUserId" from workflows
      union
      select "clerkUserId" from workflow_runs
    ) t
    order by "clerkUserId" asc
  `;

  const userIds = allIds.filter((r: any) => typeof r.clerkUserId === "string" && r.clerkUserId.startsWith("user_"));

  const results = [];
  for (const row of userIds) {
    try {
      const user = await clerk.users.getUser(row.clerkUserId);
      const primaryEmail =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses?.find((e: any) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ??
        null;

      results.push({
        clerkUserId: row.clerkUserId,
        email: primaryEmail,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
      });
    } catch (err: any) {
      results.push({
        clerkUserId: row.clerkUserId,
        email: null,
        name: null,
        error: err?.errors?.[0]?.longMessage ?? err?.message ?? String(err),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        allDistinctClerkUserIds: allIds.map((r: any) => r.clerkUserId),
        count: results.length,
        users: results,
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

