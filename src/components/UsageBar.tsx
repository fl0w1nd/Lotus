import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface UsageBarProps {
  label: string;
  percent: number;
  /** 指标图标(lucide),会继承 tone 颜色 */
  icon?: ReactNode;
  /** 覆盖显示的数值;不传则用 percent */
  valueText?: string;
  /** 数值单位,默认 "%";传空串则不显示 */
  unit?: string;
  /** 右侧附加说明,如 1.2G/4G */
  detail?: string;
  /** 进度填充基础色(CSS color / gradient),如 var(--color-c-cpu) */
  tone?: string;
  /** 是否在 75%/90% 升级为告警/危险色,默认 true */
  escalate?: boolean;
  className?: string;
}

export function UsageBar({
  label,
  percent,
  icon,
  valueText,
  unit = "%",
  detail,
  tone = "var(--color-fg-2)",
  escalate = true,
  className,
}: UsageBarProps) {
  const p = Math.min(Math.max(percent, 0), 100);
  const fill =
    escalate && p >= 90 ? "var(--color-down)" : escalate && p >= 75 ? "var(--color-warn)" : tone;
  const display = valueText ?? p.toFixed(p >= 10 ? 0 : 1);

  return (
    <div className={cn("group/bar flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-faint">
          {icon && (
            <span className="shrink-0" style={{ color: tone }}>
              {icon}
            </span>
          )}
          <span className="text-[10px] font-medium uppercase tracking-[0.07em]">{label}</span>
        </div>
        <span className="tnum flex items-baseline gap-1.5 font-mono leading-none text-fg-2">
          {detail ? (
            <span className="hidden text-[10px] text-faint max-sm:inline sm:group-hover/bar:inline">
              {detail}
            </span>
          ) : null}
          <span className="text-[12px] font-semibold">
            {display}
            {unit && <span className="ml-px text-[9.5px] font-normal text-faint">{unit}</span>}
          </span>
        </span>
      </div>
      <div className="seg-bar" aria-hidden>
        <span style={{ width: `${p}%`, background: fill }} />
      </div>
    </div>
  );
}
