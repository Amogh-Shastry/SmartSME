import { cn } from "@/lib/utils";

export interface BarItem {
  label: string;
  value: number;
  display: string;
}

export function BarList({
  items,
  colorVar = "--chart-1",
  emptyLabel = "No data yet.",
  className,
}: {
  items: BarItem[];
  colorVar?: string;
  emptyLabel?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return <p className={cn("py-6 text-center text-sm text-muted-foreground", className)}>{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm">{it.label}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, (it.value / max) * 100)}%`,
                  backgroundColor: `var(${colorVar})`,
                }}
              />
            </div>
          </div>
          <span className="text-sm font-medium tabular-nums">{it.display}</span>
        </li>
      ))}
    </ul>
  );
}

// A compact vertical bar chart for a time series (e.g. daily revenue).
export function MiniBars({
  data,
  colorVar = "--chart-1",
  className,
  height = 120,
}: {
  data: { label: string; value: number }[];
  colorVar?: string;
  className?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex items-end gap-1", className)} style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${d.value}`}>
          <div
            className="w-full rounded-t"
            style={{
              height: `${Math.max(2, (d.value / max) * (height - 18))}px`,
              backgroundColor: `var(${colorVar})`,
              opacity: d.value === 0 ? 0.25 : 1,
            }}
          />
          <span className="text-[9px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
