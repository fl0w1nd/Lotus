/** recharts 统一视觉:极细线、无噪点、卡片式 tooltip */

import { Text } from "recharts";

const TICK_FONT = {
  fill: "var(--lt-faint)",
  fontSize: 10,
  fontFamily: "Geist Mono, ui-monospace, monospace",
};

export const AXIS_PROPS = {
  stroke: "transparent",
  tickLine: false as const,
  axisLine: false as const,
  tick: TICK_FONT,
};

interface EdgeTickProps {
  x?: number;
  y?: number;
  payload?: { value?: number | string };
  index?: number;
  visibleTicksCount?: number;
  tickFormatter?: (value: unknown, index: number) => string;
  verticalAnchor?: "start" | "middle" | "end";
}

/**
 * X 轴刻度: 首尾标签向内对齐。
 * 末端时间标签默认居中锚定会溢出绘图区被 SVG 裁切, 这里首刻度左对齐、末刻度右对齐。
 */
export function EdgeTickX({
  x,
  y,
  payload,
  index = 0,
  visibleTicksCount = 1,
  tickFormatter,
  verticalAnchor,
}: EdgeTickProps) {
  const anchor = index === 0 ? "start" : index === visibleTicksCount - 1 ? "end" : "middle";
  const value = payload?.value;
  return (
    <Text x={x} y={y} verticalAnchor={verticalAnchor} textAnchor={anchor} {...TICK_FONT}>
      {tickFormatter ? tickFormatter(value, index) : String(value ?? "")}
    </Text>
  );
}

/** X 轴公共配置: 边缘感知刻度 + 保留首尾 */
export const X_AXIS_PROPS = {
  ...AXIS_PROPS,
  tick: <EdgeTickX />,
  interval: "preserveStartEnd" as const,
};

/** 极淡的水平基准线,提供数值参照又不喧宾夺主 */
export const GRID_PROPS = {
  vertical: false,
  stroke: "var(--lt-line)",
  strokeDasharray: "3 3",
};

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  formatter?: (value: number) => string;
  labelFormatter?: (label: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card !rounded-lg px-3 py-2 shadow-lg">
      {label !== undefined && (
        <p className="mb-1 font-mono text-[10px] text-faint">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {payload.map((p, i) => (
          <div
            key={`${p.name}-${i}`}
            className="flex items-center justify-between gap-4 text-[11px]"
          >
            <span className="flex items-center gap-1.5 text-muted">
              <span className="size-1.5 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="tnum font-mono text-fg">
              {formatter && typeof p.value === "number" ? formatter(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 多序列调色板(ping 监控等) */
export const SERIES_COLORS = [
  "oklch(0.70 0.14 240)",
  "oklch(0.72 0.17 162)",
  "oklch(0.68 0.16 12)",
  "oklch(0.76 0.13 75)",
  "oklch(0.68 0.14 295)",
  "oklch(0.72 0.13 195)",
  "oklch(0.65 0.15 330)",
  "oklch(0.75 0.12 120)",
  "oklch(0.62 0.13 270)",
  "oklch(0.70 0.15 45)",
];
