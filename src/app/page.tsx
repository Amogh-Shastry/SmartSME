import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctx = await getCurrentUser();
  redirect(ctx ? "/dashboard" : "/sign-in");
}
