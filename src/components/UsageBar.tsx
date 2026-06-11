import { cn } from "@/lib/utils";

interface UsageBarProps {
  label: string;
  percent: number;
  /** 右侧附加说明,如 1.2G/4G */
  detail?: string;
  className?: string;
}

function barColor(p: number): string {
  if (p >= 90) return "bg-gradient-to-r from-down/70 to-down";
  if (p >= 75) return "bg-gradient-to-r from-warn/70 to-warn";
  return "bg-gradient-to-r from-fg-2/70 to-fg-2";
}

export function UsageBar({ label, percent, detail, className }: UsageBarProps) {
  const p = Math.min(Math.max(percent, 0), 100);
  return (
    <div className={cn("group/bar", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
          {label}
        </span>
        <span className="tnum font-mono text-[11px] leading-none text-fg-2">
          {detail ? (
            // 触屏设备无 hover,小屏常显明细
            <span className="mr-1.5 hidden text-faint max-sm:inline sm:group-hover/bar:inline">
              {detail}
            </span>
          ) : null}
          {p.toFixed(p >= 10 ? 0 : 1)}%
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-700 ease-out",
            barColor(p),
          )}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}
