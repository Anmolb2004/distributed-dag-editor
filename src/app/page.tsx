/**
 * Home route: sends signed-in users to the dashboard and others to sign-in.
 */
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }
  redirect("/sign-in");
}
