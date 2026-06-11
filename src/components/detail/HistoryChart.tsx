import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchServerMetrics } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn, formatSpeed } from "@/lib/utils";
import type { MetricPeriod, MetricType } from "@/types/nezha";
import { AXIS_PROPS, ChartTooltip, GRID_PROPS } from "./ChartTheme";

const METRICS: {
  key: MetricType;
  labelKey: "cpu" | "memory" | "disk" | "netIn" | "netOut" | "load" | "process" | "connections";
  unit: "percent" | "speed" | "raw";
  /** 与实时图表保持一致的语义色 */
  color: string;
}[] = [
  { key: "cpu", labelKey: "cpu", unit: "percent", color: "var(--color-c-cpu)" },
  { key: "memory", labelKey: "memory", unit: "percent", color: "var(--color-c-mem)" },
  { key: "disk", labelKey: "disk", unit: "percent", color: "var(--color-c-disk)" },
  { key: "net_in_speed", labelKey: "netIn", unit: "speed", color: "var(--color-c-in)" },
  { key: "net_out_speed", labelKey: "netOut", unit: "speed", color: "var(--color-c-out)" },
  { key: "load1", labelKey: "load", unit: "raw", color: "var(--lt-accent)" },
  { key: "process_count", labelKey: "process", unit: "raw", color: "var(--color-c-out)" },
  { key: "tcp_conn", labelKey: "connections", unit: "raw", color: "var(--color-c-in)" },
];

export function HistoryChart({ serverId }: { serverId: number }) {
  const { t } = useI18n();
  const [metric, setMetric] = useState<MetricType>("cpu");
  const [period, setPeriod] = useState<MetricPeriod>("1d");

  const { data, isLoading } = useQuery({
    queryKey: ["metrics", serverId, metric, period],
    queryFn: () => fetchServerMetrics(serverId, metric, period),
    refetchInterval: 5 * 60_000,
  });

  const meta = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const points = (data?.data?.data_points ?? []).map((p) => ({
    t: p.ts,
    v: meta.unit === "speed" ? p.value : Math.round(p.value * 10) / 10,
  }));

  const timeLabel = (ts: number) => {
    const d = new Date(ts);
    return period === "1d"
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-GB", { month: "2-digit", day: "2-digit" }) +
          " " +
          d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const fmt = (v: number) =>
    meta.unit === "percent" ? `${v}%` : meta.unit === "speed" ? formatSpeed(v) : v.toLocaleString();

  const periods: { key: MetricPeriod; label: string }[] = [
    { key: "1d", label: t("period1d") },
    { key: "7d", label: t("period7d") },
    { key: "30d", label: t("period30d") },
  ];

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold tracking-tight">{t("history")}</h3>
          <span className="rounded border border-line px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-faint">
            tsdb
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                className={cn(
                  "rounded-md px-2 py-1 text-[10.5px] font-medium transition-all",
                  metric === m.key
                    ? "bg-surface-2 text-fg shadow-sm"
                    : "text-muted hover:text-fg-2",
                )}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5">
            {periods.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "rounded-md px-2 py-1 font-mono text-[10.5px] font-medium transition-all",
                  period === p.key
                    ? "bg-surface-2 text-fg shadow-sm"
                    : "text-muted hover:text-fg-2",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={points}
          margin={{
            top: 4,
            right: 0,
            bottom: 0,
            left: meta.unit === "speed" ? -6 : meta.unit === "raw" ? -10 : -14,
          }}
        >
          <defs>
            <linearGradient id={`g-hist-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="t" tickFormatter={timeLabel} {...AXIS_PROPS} minTickGap={70} />
          <YAxis
            tickFormatter={(v: number) => fmt(v)}
            {...AXIS_PROPS}
            width={meta.unit === "speed" ? 64 : 46}
            domain={meta.unit === "percent" ? [0, 100] : undefined}
          />
          <Tooltip
            content={<ChartTooltip formatter={fmt} labelFormatter={(l) => timeLabel(Number(l))} />}
          />
          <Area
            type="monotone"
            dataKey="v"
            name={t(meta.labelKey)}
            stroke={meta.color}
            strokeWidth={1.5}
            fill={`url(#g-hist-${metric})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {isLoading && <p className="pt-2 text-center font-mono text-[10px] text-faint">…</p>}
    </div>
  );
}
