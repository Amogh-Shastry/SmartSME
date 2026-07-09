"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, initials } from "@/lib/utils";
import { Icon, type IconName } from "@/components/icons";
import { BrandLockup } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/lib/auth/actions";

type NavItem = { href: string; label: string; icon: IconName };
type NavGroup = { label?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/input", label: "Smart Input", icon: "input" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/sales", label: "Sales", icon: "sales" },
      { href: "/purchases", label: "Purchases", icon: "purchases" },
      { href: "/products", label: "Products", icon: "products" },
      { href: "/parties", label: "Parties", icon: "parties" },
      { href: "/expenses", label: "Expenses", icon: "expenses" },
    ],
  },
  {
    label: "Insight & automation",
    items: [
      { href: "/reports", label: "Reports", icon: "reports" },
      { href: "/workflow", label: "Workflow", icon: "workflow" },
      { href: "/events", label: "Event bus", icon: "events" },
    ],
  },
];

export function AppShell({
  businessName,
  userName,
  userEmail,
  unread,
  children,
}: {
  businessName: string;
  userName: string;
  userEmail: string;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-1">
          {group.label && (
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </div>
          )}
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex h-16 items-center border-b border-border px-5">
        <BrandLockup />
      </div>
      {nav}
      <div className="border-t border-border p-3">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive("/settings")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon name="settings" size={18} />
          Settings
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-card">
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" size={20} />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <Icon name="building" size={16} className="text-muted-foreground" />
            <span className="truncate text-sm font-medium">{businessName}</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Notifications"
            >
              <Icon name="bell" size={18} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {initials(userName)}
              </span>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-medium">{userName}</div>
                <div className="text-[11px] text-muted-foreground">{userEmail}</div>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Icon name="logout" size={18} />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
