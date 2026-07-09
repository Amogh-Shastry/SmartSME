"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Icon name="reports" size={16} /> {label}
    </Button>
  );
}
