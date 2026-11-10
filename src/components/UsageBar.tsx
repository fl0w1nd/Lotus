import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 指标条正常态的中性色;颜色只用来表达告警/危险 */
export const METER_TONE = "var(--color-meter)";

/**
 * 按"显示出来的整数百分比"判定告警等级,
 * 避免 89.6% 显示成 90% 却仍是告警色这类显示与颜色不一致。
 */
export function usageFill(percent: number, tone: string = METER_TONE): string {
  const shown = Math.round(Math.min(Math.max(percent, 0), 100));
  return shown >= 90 ? "var(--color-down)" : shown >= 75 ? "var(--color-warn)" : tone;
}

interface SegmentedBarProps {
  percent: number;
  fill: string;
  /** 段数,默认 28;窄条请按宽度调小 */
  segments?: number;
  size?: "sm" | "md";
  className?: string;
}

/** 分段进度条:段数固定,填充按整段吸附(非零值至少亮一段) */
export function SegmentedBar({
  percent,
  fill,
  segments = 28,
  size = "md",
  className,
}: SegmentedBarProps) {
  const p = Math.min(Math.max(percent, 0), 100);
  const lit = p > 0 ? Math.max(1, Math.round((p / 100) * segments)) : 0;
  return (
    <div
      className={cn("seg-bar", size === "sm" && "!h-[5px]", className)}
      style={{ "--seg-n": segments, "--seg-on": lit } as CSSProperties}
      aria-hidden
    >
      <span style={{ background: fill }} />
    </div>
  );
}

interface UsageBarProps {
  label: string;
  percent: number;
  /** 指标图标(lucide);正常态为中性色,告警时跟随告警色 */
  icon?: ReactNode;
  /** 覆盖显示的数值;不传则用 percent */
  valueText?: string;
  /** 数值单位,默认 "%";传空串则不显示 */
  unit?: string;
  /** 右侧附加说明,如 1.2G/4G */
  detail?: string;
  /** 正常态填充色,默认中性色 */
  tone?: string;
  /** 是否在 75%/90% 升级为告警/危险色,默认 true */
  escalate?: boolean;
  segments?: number;
  /** 单行布局:标签 | 进度条 | 数值;附加说明改为悬停提示 */
  inline?: boolean;
  className?: string;
}

export function UsageBar({
  label,
  percent,
  icon,
  valueText,
  unit = "%",
  detail,
  tone = METER_TONE,
  escalate = true,
  segments,
  inline = false,
  className,
}: UsageBarProps) {
  const p = Math.min(Math.max(percent, 0), 100);
  const fill = escalate ? usageFill(p, tone) : tone;
  const alert = fill !== tone;
  const display = valueText ?? p.toFixed(p >= 10 ? 0 : 1);

  if (inline) {
    return (
      <div className={cn("flex items-center gap-2.5", className)} title={detail}>
        <div className="flex w-[60px] shrink-0 items-center gap-1.5 text-muted">
          {icon && (
            <span className="shrink-0" style={alert ? { color: fill } : undefined}>
              {icon}
            </span>
          )}
          <span className="label-caps truncate text-[11px] font-medium">{label}</span>
        </div>
        <SegmentedBar percent={p} fill={fill} segments={segments ?? 16} className="flex-1" />
        <span
          className="tnum w-[58px] shrink-0 whitespace-nowrap text-right font-mono text-[12px] font-semibold leading-none text-fg-2"
          style={alert ? { color: fill } : undefined}
        >
          {display}
          {unit && <span className="ml-0.5 text-[10px] font-normal text-faint">{unit}</span>}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("group/bar flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-muted">
          {icon && (
            <span className="shrink-0" style={alert ? { color: fill } : undefined}>
              {icon}
            </span>
          )}
          <span className="label-caps text-[11px] font-medium">{label}</span>
        </div>
        <span className="tnum flex items-baseline gap-1.5 font-mono leading-none text-fg-2">
          {detail ? (
            <span className="hidden text-[10px] text-faint max-sm:inline sm:group-hover/bar:inline">
              {detail}
            </span>
          ) : null}
          <span className="text-[12px] font-semibold" style={alert ? { color: fill } : undefined}>
            {display}
            {unit && <span className="ml-0.5 text-[10px] font-normal text-faint">{unit}</span>}
          </span>
        </span>
      </div>
      <SegmentedBar percent={p} fill={fill} segments={segments} />
    </div>
  );
}
