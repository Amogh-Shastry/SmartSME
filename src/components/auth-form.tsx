"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});
  const [email, setEmail] = useState(mode === "signin" ? "" : "");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "signup" && (
        <>
          <Field label="Business name">
            <Input name="businessName" placeholder="Acme Traders" required />
          </Field>
          <Field label="Your name">
            <Input name="name" placeholder="Ravi Kumar" required />
          </Field>
        </>
      )}
      <Field label="Email">
        <Input
          name="email"
          type="email"
          placeholder="you@business.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </Field>
      <Field label="Password">
        <Input
          name="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
        />
      </Field>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      {mode === "signin" ? (
        <>
          <button
            type="button"
            onClick={() => {
              setEmail("demo@smartsme.app");
              setPassword("demo1234");
            }}
            className="text-sm text-primary hover:underline"
          >
            Use the demo account
          </button>
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </form>
  );
}
