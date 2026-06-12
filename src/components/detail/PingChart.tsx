import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchServerMonitor } from "@/lib/api";
import { useIsLogin } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MonitorPeriod } from "@/types/nezha";
import { AXIS_PROPS, GRID_PROPS, SERIES_COLORS, X_AXIS_PROPS } from "./ChartTheme";
import {
  axisWidthFor,
  delayTickFormatter,
  lossScale,
  type NiceScale,
  niceScale,
} from "./chartScale";

/** tooltip 用精确值格式化 (轴刻度则按步长统一小数位) */
function formatDelayValue(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${v}ms`;
}

function timeLabel(t: number, withDate = false) {
  const d = new Date(t);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (!withDate) return time;
  return `${d.toLocaleDateString("en-GB", { month: "2-digit", day: "2-digit" })} ${time}`;
}

/**
 * 从延迟序列中估算每一个点的瞬时丢包率 (EWMA 指数滑动平均平滑)
 * 移植自 hamster1963/nezha-dash 的 calculatePacketLoss 算法
 */
function calculatePacketLoss(delays: number[]): number[] {
  if (!delays || delays.length === 0) return [];

  const packetLossRates: number[] = [];
  const windowSize = Math.min(10, Math.max(3, Math.floor(delays.length / 10)));
  const timeoutThreshold = 3000;
  const extremeDelayThreshold = 10000;

  for (let i = 0; i < delays.length; i++) {
    const currentDelay = delays[i];
    let lossRate = 0;

    if (currentDelay === 0 || currentDelay === null || currentDelay === undefined) {
      lossRate = 100;
    } else if (currentDelay >= extremeDelayThreshold) {
      lossRate = Math.min(95, 60 + (currentDelay - extremeDelayThreshold) / 1000);
    } else if (currentDelay >= timeoutThreshold) {
      lossRate = Math.min(50, (currentDelay - timeoutThreshold) / 200);
    } else {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(delays.length, i + Math.ceil(windowSize / 2));
      const windowDelays = delays.slice(start, end).filter((d) => d > 0);

      if (windowDelays.length > 2) {
        const mean = windowDelays.reduce((sum, d) => sum + d, 0) / windowDelays.length;
        const variance =
          windowDelays.reduce((sum, d) => sum + (d - mean) ** 2, 0) / windowDelays.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = standardDeviation / mean;

        if (coefficientOfVariation > 0.8) {
          lossRate = Math.min(25, coefficientOfVariation * 15);
        } else if (coefficientOfVariation > 0.5) {
          lossRate = Math.min(10, coefficientOfVariation * 8);
        } else if (coefficientOfVariation > 0.3) {
          lossRate = Math.min(5, coefficientOfVariation * 5);
        }

        if (currentDelay > mean * 2.5) {
          lossRate += Math.min(15, (currentDelay / mean - 2.5) * 10);
        }
      }
    }

    if (i > 0) {
      const alpha = 0.3;
      lossRate = alpha * lossRate + (1 - alpha) * packetLossRates[i - 1];
    }

    packetLossRates.push(Math.max(0, Math.min(100, lossRate)));
  }

  return packetLossRates.map((rate) => Number(rate.toFixed(2)));
}

interface MonitorWithLoss {
  monitor_id: number;
  monitor_name: string;
  display_index?: number;
  server_id: number;
  server_name: string;
  created_at: number[];
  avg_delay: number[];
  packet_loss?: number[];
  index: number;
  lossArray: number[];
  avgLoss: number;
}

function PingTooltip({
  active,
  payload,
  label,
  monitors,
  lang,
  formatDelay,
  withDate,
}: {
  active?: boolean;
  payload?: { payload?: Record<string, number | null | undefined> }[];
  label?: string | number;
  monitors: MonitorWithLoss[];
  lang: string;
  formatDelay: (v: number) => string;
  withDate?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const dataPoint = payload[0].payload ?? {};
  const zh = lang.startsWith("zh");

  return (
    <div className="card !rounded-lg px-3 py-2 shadow-lg">
      {label !== undefined && (
        <p className="mb-1 font-mono text-[10px] text-faint">
          {timeLabel(Number(label), withDate)}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {monitors.map((m) => {
          const delayVal = dataPoint[m.monitor_name];
          const lossVal = dataPoint[`${m.monitor_name}_loss`];

          if (
            (delayVal === undefined || delayVal === null) &&
            (lossVal === undefined || lossVal === null)
          ) {
            return null;
          }

          const color = SERIES_COLORS[m.index % SERIES_COLORS.length];

          return (
            <div key={m.monitor_id} className="flex items-center justify-between gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="size-1.5 rounded-full" style={{ background: color }} />
                {m.monitor_name}
              </span>
              <span className="tnum font-mono text-fg flex items-center gap-2">
                <span>
                  {delayVal !== undefined && delayVal !== null
                    ? formatDelay(delayVal)
                    : zh
                      ? "探测失败"
                      : "Timeout"}
                </span>
                {delayVal !== undefined &&
                  delayVal !== null &&
                  lossVal !== undefined &&
                  lossVal !== null &&
                  lossVal >= 0.05 && (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        lossVal >= 10 ? "text-down" : lossVal >= 1 ? "text-warn" : "text-faint",
                      )}
                    >
                      ({lossVal.toFixed(1)}% {zh ? "丢包" : "Loss"})
                    </span>
                  )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PingChart({ serverId }: { serverId: number }) {
  const { t, lang } = useI18n();
  // 默认全选，toggle 选中/取消
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState<MonitorPeriod>("1d");

  // 与官方主题一致: 1d 之外的区间仅登录用户可用, 登出后自动回落
  const isLogin = useIsLogin();
  useEffect(() => {
    if (!isLogin && period !== "1d") setPeriod("1d");
  }, [isLogin, period]);

  const { data, isPlaceholderData } = useQuery({
    queryKey: ["monitor", serverId, period],
    queryFn: () => fetchServerMonitor(serverId, period),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const withDate = period !== "1d";

  const monitors = useMemo(
    () =>
      (data?.data ?? []).slice().sort((a, b) => (a.display_index ?? 0) - (b.display_index ?? 0)),
    [data],
  );

  const monitorsWithLoss = useMemo(() => {
    return monitors.map((m, index) => {
      let lossArray: number[] = [];
      if (m.packet_loss?.length) {
        lossArray = m.packet_loss.map((v) => v * 100);
      } else {
        lossArray = calculatePacketLoss(m.avg_delay ?? []);
      }
      const avgLoss =
        lossArray.length > 0 ? lossArray.reduce((a, b) => a + b, 0) / lossArray.length : 0;
      return {
        ...m,
        index,
        lossArray,
        avgLoss,
      };
    });
  }, [monitors]);

  // monitors 变化时同步全选
  const allNames = useMemo(
    () => new Set(monitorsWithLoss.map((m) => m.monitor_name)),
    [monitorsWithLoss],
  );
  const effectiveSelected = selected.size === 0 ? allNames : selected;
  const visibleMonitors = useMemo(
    () => monitorsWithLoss.filter((m) => effectiveSelected.has(m.monitor_name)),
    [monitorsWithLoss, effectiveSelected],
  );

  const chartData = useMemo(() => {
    const byTs = new Map<number, Record<string, number | null>>();
    for (const m of visibleMonitors) {
      m.created_at.forEach((ts, i) => {
        const row = byTs.get(ts) ?? {};
        const delay = m.avg_delay[i];
        row[m.monitor_name] = delay > 0 ? Math.round(delay * 10) / 10 : null;
        row[`${m.monitor_name}_loss`] = m.lossArray[i] ?? 0;
        byTs.set(ts, row);
      });
    }
    return [...byTs.entries()].sort((a, b) => a[0] - b[0]).map(([ts, row]) => ({ t: ts, ...row }));
  }, [visibleMonitors]);

  // 延迟轴: P95 裁剪尖刺 + 自动基线 (整体悬浮高位时抬升, 不再压成一条直线) + 显式 nice 刻度
  // 丢包轴: 预设档位动态量程, 轻微丢包不放大、严重故障占满
  const { delayScale, delayFmt, delayYWidth, lossSc, lossYWidth } = useMemo(() => {
    const vals: number[] = [];
    let lossMax = 0;
    for (const row of chartData as Record<string, number | null | undefined>[]) {
      for (const m of visibleMonitors) {
        const v = row[m.monitor_name];
        if (typeof v === "number" && v > 0) vals.push(v);
        const l = row[`${m.monitor_name}_loss`];
        if (typeof l === "number" && l > lossMax) lossMax = l;
      }
    }

    let scale: NiceScale;
    if (vals.length === 0) {
      scale = niceScale(0, 100);
    } else {
      vals.sort((a, b) => a - b);
      const min = vals[0];
      const p95 = vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.95))];
      scale = niceScale(min, p95, {
        baseline: "auto",
        baselineRatio: 0.25,
        minSpanRatio: 0.1,
      });
    }

    const fmt = delayTickFormatter(scale);
    const loss = lossScale(lossMax);
    return {
      delayScale: scale,
      delayFmt: fmt,
      delayYWidth: axisWidthFor(scale.ticks.map(fmt)),
      lossSc: loss,
      lossYWidth: axisWidthFor(loss.ticks.map((v) => `${v}%`)),
    };
  }, [chartData, visibleMonitors]);

  if (!monitors.length) return null;

  const handleClick = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      // 全部取消 → 回到全选
      if (next.size === 0) return new Set();
      // 全部选中 → 用空集合表示全选
      if (next.size === allNames.size) return new Set();
      return next;
    });
  };

  const periods: { key: MonitorPeriod; label: string }[] = [
    { key: "1d", label: t("period1d") },
    { key: "7d", label: t("period7d") },
    { key: "30d", label: t("period30d") },
  ];

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold tracking-tight">{t("pingChart")}</h3>
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5">
            {periods.map((p) => {
              const locked = !isLogin && p.key !== "1d";
              return (
                <button
                  key={p.key}
                  type="button"
                  disabled={locked}
                  title={locked ? t("loginToView") : undefined}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "rounded-md px-2 py-1 font-mono text-[10.5px] font-medium transition-all",
                    period === p.key
                      ? "bg-surface-2 text-fg shadow-sm"
                      : "text-muted hover:text-fg-2",
                    locked && "cursor-not-allowed text-faint opacity-45 hover:text-faint",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {monitorsWithLoss.map((m) => {
            const isVisible = effectiveSelected.has(m.monitor_name);
            const color = SERIES_COLORS[m.index % SERIES_COLORS.length];
            const loss = m.avgLoss;
            return (
              <button
                key={m.monitor_id}
                type="button"
                onClick={() => handleClick(m.monitor_name)}
                title={`${t("packetLoss")} ${loss.toFixed(1)}%`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-medium transition-all",
                  isVisible
                    ? "bg-surface-2 text-fg ring-1 ring-accent/30"
                    : "text-faint opacity-50 hover:opacity-80",
                )}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: isVisible ? color : "var(--lt-faint)" }}
                />
                {m.monitor_name}
                {loss >= 0.05 && (
                  <span
                    className={cn(
                      "tnum font-mono text-[10px]",
                      loss >= 10 ? "text-down" : loss >= 1 ? "text-warn" : "text-faint",
                    )}
                  >
                    {loss.toFixed(1)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div
        className={cn(
          "transition-opacity duration-300",
          isPlaceholderData && "pointer-events-none opacity-50",
        )}
      >
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="t"
              tickFormatter={(v: number) => timeLabel(v, withDate)}
              {...X_AXIS_PROPS}
              minTickGap={withDate ? 75 : 60}
            />
            <YAxis
              yAxisId="delay"
              tickFormatter={delayFmt}
              domain={delayScale.domain}
              ticks={delayScale.ticks}
              allowDataOverflow
              {...AXIS_PROPS}
              width={delayYWidth}
            />
            <YAxis
              yAxisId="loss"
              orientation="right"
              tickFormatter={(v: number) => `${v}%`}
              domain={lossSc.domain}
              ticks={lossSc.ticks}
              allowDataOverflow
              {...AXIS_PROPS}
              width={lossYWidth}
            />
            <Tooltip
              content={
                <PingTooltip
                  monitors={visibleMonitors}
                  lang={lang}
                  formatDelay={formatDelayValue}
                  withDate={withDate}
                />
              }
            />
            {visibleMonitors.map((m) => (
              <Area
                key={`loss-${m.monitor_id}`}
                yAxisId="loss"
                type="monotone"
                dataKey={`${m.monitor_name}_loss`}
                stroke="none"
                fill={SERIES_COLORS[m.index % SERIES_COLORS.length]}
                fillOpacity={0.2}
                isAnimationActive={false}
                dot={false}
                connectNulls
                name={`${m.monitor_name} ${t("packetLoss")}`}
              />
            ))}
            {visibleMonitors.map((m) => (
              <Line
                key={m.monitor_id}
                yAxisId="delay"
                type="monotone"
                dataKey={m.monitor_name}
                stroke={SERIES_COLORS[m.index % SERIES_COLORS.length]}
                strokeWidth={1.4}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
