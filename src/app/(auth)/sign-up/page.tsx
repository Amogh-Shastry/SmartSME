import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Create your workspace</h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Set up SmartSME for your business in seconds.
      </p>
      <AuthForm mode="signup" />
    </div>
  );
}
