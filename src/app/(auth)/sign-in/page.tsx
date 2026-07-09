import { AuthForm } from "@/components/auth-form";

export default function SignInPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Sign in to your SmartSME workspace.
      </p>
      <AuthForm mode="signin" />
    </div>
  );
}
