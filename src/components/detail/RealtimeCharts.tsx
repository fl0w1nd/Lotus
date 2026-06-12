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
import { AXIS_PROPS, ChartTooltip, GRID_PROPS, X_AXIS_PROPS } from "./ChartTheme";
import { axisWidthFor, PERCENT_SCALE, speedScale } from "./chartScale";

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: historyOf 读取的是 ref, snapshot 才是数据更新的触发器
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

  const maxSpeed = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map((d) => Math.max(d.up, d.down)));
  }, [data]);

  // 刻度在显示单位 (KB/MB/GB) 数值上取 nice number, 轴宽由实际标签精确预算
  const speedSc = useMemo(() => speedScale(maxSpeed), [maxSpeed]);
  const speedYWidth = axisWidthFor(speedSc.ticks.map(speedSc.format));

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {/* CPU / 内存 */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-tight flex items-baseline gap-1">
            <span>
              {t("cpu")} / {t("memory")}
            </span>
            <span className="text-[10px] font-normal text-faint normal-case">(%)</span>
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
          <AreaChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
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
            <XAxis dataKey="t" tickFormatter={timeLabel} {...X_AXIS_PROPS} minTickGap={50} />
            <YAxis
              domain={PERCENT_SCALE.domain}
              ticks={PERCENT_SCALE.ticks}
              tickFormatter={(v) => String(v)}
              {...AXIS_PROPS}
              width={26}
            />
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
          <h3 className="text-xs font-semibold tracking-tight flex items-baseline gap-1">
            <span>{t("netSpeed")}</span>
            <span className="text-[10px] font-normal text-faint normal-case">({speedSc.unit})</span>
          </h3>
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
          <AreaChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
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
            <XAxis dataKey="t" tickFormatter={timeLabel} {...X_AXIS_PROPS} minTickGap={50} />
            <YAxis
              domain={speedSc.domain}
              ticks={speedSc.ticks}
              tickFormatter={speedSc.format}
              {...AXIS_PROPS}
              width={speedYWidth}
            />
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
