import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchServerMonitor } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AXIS_PROPS, ChartTooltip, GRID_PROPS, SERIES_COLORS } from "./ChartTheme";

function timeLabel(t: number) {
  return new Date(t).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PingChart({ serverId }: { serverId: number }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  const { data } = useQuery({
    queryKey: ["monitor", serverId],
    queryFn: () => fetchServerMonitor(serverId),
    refetchInterval: 60_000,
  });

  const monitors = useMemo(
    () =>
      (data?.data ?? []).slice().sort((a, b) => (a.display_index ?? 0) - (b.display_index ?? 0)),
    [data],
  );

  const chartData = useMemo(() => {
    const byTs = new Map<number, Record<string, number | null>>();
    for (const m of monitors) {
      if (hidden.has(m.monitor_id)) continue;
      m.created_at.forEach((ts, i) => {
        const row = byTs.get(ts) ?? {};
        const delay = m.avg_delay[i];
        // 延迟为 0 表示该周期探测失败,置 null 不画成 0ms
        row[m.monitor_name] = delay > 0 ? Math.round(delay * 10) / 10 : null;
        byTs.set(ts, row);
      });
    }
    return [...byTs.entries()].sort((a, b) => a[0] - b[0]).map(([ts, row]) => ({ t: ts, ...row }));
  }, [monitors, hidden]);

  // 丢包率:优先用后端提供的 packet_loss;否则用与 nezha-dash 一致的
  // 启发式从延迟序列估算(失败=100%,超高延迟分段映射,正常延迟用
  // 滑动窗口变异系数推断抖动丢包)
  const lossOf = (m: (typeof monitors)[number]): number => {
    if (m.packet_loss?.length) {
      return (m.packet_loss.reduce((a, b) => a + b, 0) / m.packet_loss.length) * 100;
    }
    const delays = m.avg_delay ?? [];
    if (!delays.length) return 0;
    const perPoint = delays.map((d, i) => {
      if (!(d > 0)) return 1;
      if (d >= 10000) return Math.min(0.95, 0.6 + ((d - 10000) / 20000) * 0.35);
      if (d >= 3000) return Math.min(0.5, ((d - 3000) / 7000) * 0.5);
      // 滑动窗口变异系数:延迟抖动越大,丢包概率越高(上限 25%)
      const win = delays.slice(Math.max(0, i - 9), i + 1).filter((v) => v > 0);
      if (win.length < 3) return 0;
      const mean = win.reduce((a, b) => a + b, 0) / win.length;
      const std = Math.sqrt(win.reduce((a, b) => a + (b - mean) ** 2, 0) / win.length);
      return Math.min(0.25, Math.max(0, (std / mean - 0.3) * 0.5));
    });
    return (perPoint.reduce((a, b) => a + b, 0) / perPoint.length) * 100;
  };

  if (!monitors.length) return null;

  const toggle = (id: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-tight">{t("pingChart")}</h3>
        <div className="flex flex-wrap items-center gap-1">
          {monitors.map((m, i) => {
            const off = hidden.has(m.monitor_id);
            const color = SERIES_COLORS[i % SERIES_COLORS.length];
            const loss = lossOf(m);
            return (
              <button
                key={m.monitor_id}
                type="button"
                onClick={() => toggle(m.monitor_id)}
                title={`${t("packetLoss")} ${loss.toFixed(1)}%`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-medium transition-all",
                  off ? "text-faint opacity-50 hover:opacity-80" : "bg-surface-2 text-fg-2",
                )}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: off ? "var(--lt-faint)" : color }}
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
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -10 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="t" tickFormatter={timeLabel} {...AXIS_PROPS} minTickGap={60} />
          <YAxis tickFormatter={(v: number) => `${v}ms`} {...AXIS_PROPS} width={50} />
          <Tooltip
            content={
              <ChartTooltip
                formatter={(v) => `${v} ms`}
                labelFormatter={(l) => timeLabel(Number(l))}
              />
            }
          />
          {monitors.map((m, i) =>
            hidden.has(m.monitor_id) ? null : (
              <Line
                key={m.monitor_id}
                type="monotone"
                dataKey={m.monitor_name}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={1.4}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ),
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
