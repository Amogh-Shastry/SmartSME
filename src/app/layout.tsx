import type { Metadata } from "next";
import { themeInitScript } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartSME — AI business management",
  description:
    "AI-powered, event-driven business management for SMEs. Sales, inventory, expenses, and a smart input engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
