"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as s from "@/db/schema";
import { defaultRules } from "@/lib/workflow/defaults";
import { clearSessionCookie, setSessionCookie } from "./session";
import { hashPassword, verifyPassword } from "./password";

export interface AuthFormState {
  error?: string;
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const [user] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await setSessionCookie(user.id);
  redirect("/dashboard");
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const businessName = String(formData.get("businessName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!businessName || !name || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const existing = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
  if (existing.length > 0) return { error: "An account with this email already exists." };

  const [biz] = await db
    .insert(s.businesses)
    .values({ name: businessName })
    .returning();

  const [user] = await db
    .insert(s.users)
    .values({
      businessId: biz.id,
      email,
      name,
      passwordHash: await hashPassword(password),
      role: "owner",
    })
    .returning();

  await db.insert(s.workflowRules).values(defaultRules(biz.id));

  await setSessionCookie(user.id);
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/sign-in");
}
