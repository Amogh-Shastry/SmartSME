import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { BrandMark } from "@/components/brand";

// Reads cookies + DB to redirect signed-in users, always dynamic.
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentUser();
  if (ctx) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden overflow-hidden text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{ backgroundImage: "linear-gradient(150deg, var(--primary-hover), var(--primary))" }}
      >
        {/* Soft radial glows for depth */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)" }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[30%] bg-white/15 font-bold ring-1 ring-inset ring-white/25">
            S
          </div>
          <span className="text-lg font-semibold">SmartSME</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Run your business on autopilot.
          </h1>
          <p className="mt-4 text-primary-foreground/80">
            Event-driven ERP with an AI input engine. Type or snap a photo and SmartSME turns it
            into sales, purchases, inventory updates, and alerts automatically.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/90">
            <li className="flex items-center gap-2">✦ Natural-language & OCR business input</li>
            <li className="flex items-center gap-2">✦ Automatic inventory + workflow engine</li>
            <li className="flex items-center gap-2">✦ Real-time dashboard & business health</li>
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/70">
          Zero setup. Runs on an embedded database out of the box.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="text-lg font-semibold">SmartSME</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
