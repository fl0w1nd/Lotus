import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { AXIS_PROPS, ChartTooltip, GRID_PROPS, X_AXIS_PROPS } from "./ChartTheme";
import { axisWidthFor, niceScale, PERCENT_SCALE, speedScale, tickFormat } from "./chartScale";

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
  const points = useMemo(
    () =>
      (data?.data?.data_points ?? []).map((p) => ({
        t: p.ts,
        v: meta.unit === "speed" ? p.value : Math.round(p.value * 10) / 10,
      })),
    [data, meta.unit],
  );

  // 三类量纲的刻度策略:
  // percent 固定 0-100; speed 按显示单位取 nice 刻度;
  // raw (负载/进程/连接) 自动基线 — 数据悬浮高位时抬升, 保留波形对比
  const { yDomain, yTicks, yTickFmt, yWidth, speedUnit } = useMemo(() => {
    if (meta.unit === "percent") {
      return {
        yDomain: PERCENT_SCALE.domain,
        yTicks: PERCENT_SCALE.ticks,
        yTickFmt: (v: number) => String(v),
        yWidth: 26,
        speedUnit: "",
      };
    }
    if (meta.unit === "speed") {
      const max = points.length ? Math.max(...points.map((p) => p.v)) : 0;
      const sc = speedScale(max);
      return {
        yDomain: sc.domain,
        yTicks: sc.ticks,
        yTickFmt: sc.format,
        yWidth: axisWidthFor(sc.ticks.map(sc.format)),
        speedUnit: sc.unit,
      };
    }
    const vals = points.map((p) => p.v);
    const sc = niceScale(vals.length ? Math.min(...vals) : 0, vals.length ? Math.max(...vals) : 0, {
      baseline: "auto",
      integer: metric !== "load1",
    });
    const fmt = tickFormat(sc);
    return {
      yDomain: sc.domain,
      yTicks: sc.ticks,
      yTickFmt: fmt,
      yWidth: axisWidthFor(sc.ticks.map(fmt)),
      speedUnit: "",
    };
  }, [points, meta.unit, metric]);

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
          <h3 className="text-xs font-semibold tracking-tight flex items-baseline gap-1">
            <span>{t("history")}</span>
            <span className="text-[10px] font-normal text-faint normal-case">
              {meta.unit === "percent" ? "(%)" : meta.unit === "speed" ? `(${speedUnit})` : ""}
            </span>
          </h3>
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
            top: 10,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        >
          <defs>
            <linearGradient id={`g-hist-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="t" tickFormatter={timeLabel} {...X_AXIS_PROPS} minTickGap={70} />
          <YAxis
            tickFormatter={yTickFmt}
            domain={yDomain}
            ticks={yTicks}
            {...AXIS_PROPS}
            width={yWidth}
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
