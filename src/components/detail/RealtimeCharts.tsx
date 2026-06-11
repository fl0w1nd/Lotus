import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { formatSpeed } from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";
import { AXIS_PROPS, ChartTooltip, GRID_PROPS } from "./ChartTheme";

function timeLabel(t: number) {
  return new Date(t).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function RealtimeCharts({ serverId }: { serverId: number }) {
  const { historyOf, snapshot } = useNezhaWS();
  const { t } = useI18n();

  // snapshot 变化驱动重渲染,历史从 ref 读取
  // biome-ignore lint/correctness/useExhaustiveDependencies: historyOf 读取 ref,以 snapshot 为更新信号
  const data = useMemo(
    () =>
      historyOf(serverId).map((h) => ({
        t: h.t,
        cpu: Number(h.cpu.toFixed(1)),
        mem: Number(h.memPct.toFixed(1)),
        up: h.up,
        down: h.down,
      })),
    [snapshot, serverId],
  );

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {/* CPU / 内存 */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-tight">
            {t("cpu")} / {t("memory")}
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <span className="h-px w-3 bg-c-cpu" /> {t("cpu")}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-px w-3 bg-c-mem" /> {t("memory")}
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -14 }}>
            <defs>
              <linearGradient id="g-cpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-c-cpu)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-c-cpu)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g-mem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-c-mem)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-c-mem)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="t" tickFormatter={timeLabel} {...AXIS_PROPS} minTickGap={50} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} {...AXIS_PROPS} width={46} />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v) => `${v}%`}
                  labelFormatter={(l) => timeLabel(Number(l))}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="cpu"
              name={t("cpu")}
              stroke="var(--color-c-cpu)"
              strokeWidth={1.5}
              fill="url(#g-cpu)"
              isAnimationActive={false}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="mem"
              name={t("memory")}
              stroke="var(--color-c-mem)"
              strokeWidth={1.5}
              fill="url(#g-mem)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 网络 */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-tight">{t("netSpeed")}</h3>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <span className="h-px w-3 bg-c-out" /> {t("upload")}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-px w-3 bg-c-in" /> {t("download")}
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -6 }}>
            <defs>
              <linearGradient id="g-up" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-c-out)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-c-out)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g-down" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-c-in)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-c-in)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="t" tickFormatter={timeLabel} {...AXIS_PROPS} minTickGap={50} />
            <YAxis tickFormatter={(v: number) => formatSpeed(v)} {...AXIS_PROPS} width={64} />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v) => formatSpeed(v)}
                  labelFormatter={(l) => timeLabel(Number(l))}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="up"
              name={t("upload")}
              stroke="var(--color-c-out)"
              strokeWidth={1.5}
              fill="url(#g-up)"
              isAnimationActive={false}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="down"
              name={t("download")}
              stroke="var(--color-c-in)"
              strokeWidth={1.5}
              fill="url(#g-down)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
