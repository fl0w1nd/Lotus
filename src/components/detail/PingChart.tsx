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
    const byTs = new Map<number, Record<string, number>>();
    for (const m of monitors) {
      if (hidden.has(m.monitor_id)) continue;
      m.created_at.forEach((ts, i) => {
        const row = byTs.get(ts) ?? {};
        row[m.monitor_name] = Math.round(m.avg_delay[i] * 10) / 10;
        byTs.set(ts, row);
      });
    }
    return [...byTs.entries()].sort((a, b) => a[0] - b[0]).map(([ts, row]) => ({ t: ts, ...row }));
  }, [monitors, hidden]);

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
            return (
              <button
                key={m.monitor_id}
                type="button"
                onClick={() => toggle(m.monitor_id)}
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
