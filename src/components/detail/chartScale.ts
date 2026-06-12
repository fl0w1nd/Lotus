/**
 * 线性坐标轴刻度引擎
 *
 * 解决 recharts 默认刻度的三类问题:
 * 1. 刻度值合理性 — 1/2/2.5/5 x 10^n 阶梯步长, 刻度永远是整洁数, 不会出现 333.33
 * 2. 刻度溢出 — domain 由刻度反推 (两端 = 首尾刻度), 标签宽度可精确预算出轴宽
 * 3. 对比舒适 — 数据悬浮在高位时自动抬升基线释放纵向分辨率;
 *    数据平坦时强制最小量程, 避免把噪声放大成假波动
 */

export interface NiceScale {
  domain: [number, number];
  ticks: number[];
  step: number;
}

export interface NiceScaleOptions {
  /** 期望刻度数 (含两端), 实际在 ±1 内浮动 */
  tickCount?: number;
  /** zero: 永远从 0 开始; auto: 数据离 0 较远时抬升基线增强对比 */
  baseline?: "zero" | "auto";
  /** auto 基线: 仅当 min > max * ratio 时才抬升 (数据贴近 0 时归零更诚实) */
  baselineRatio?: number;
  /** 最小量程 = max * ratio, 防止平坦数据被无限放大 */
  minSpanRatio?: number;
  /** 刻度强制整数 (进程数 / 连接数等离散量) */
  integer?: boolean;
  /** 留白比例 (相对量程), 避免曲线顶到图表边缘 */
  headroomRatio?: number;
}

/** d3 风格就近 nice 步长: 按 sqrt 阈值取 1/2/5/10 × 10^n 中最接近的 */
export function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const power = Math.floor(Math.log10(rough));
  const error = rough / 10 ** power;
  let factor: number;
  if (error >= 7.071) factor = 10;
  else if (error >= 3.162) factor = 5;
  else if (error >= Math.SQRT2) factor = 2;
  else factor = 1;
  return factor * 10 ** power;
}

/** 步长升一档 (1→2→5→10), 用于刻度过密时收紧 */
function nextStepUp(step: number): number {
  const power = Math.floor(Math.log10(step) + 1e-9);
  const factor = Math.round(step / 10 ** power);
  if (factor < 2) return 2 * 10 ** power;
  if (factor < 5) return 5 * 10 ** power;
  return 10 ** (power + 1);
}

/** 步长对应的小数位数: 取能完整表达步长的最少小数位 (0.25 → 2), 避免浮点尾数 */
export function stepDecimals(step: number): number {
  for (let d = 0; d <= 6; d++) {
    const scaled = step * 10 ** d;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) return d;
  }
  return 6;
}

export function niceScale(
  dataMin: number,
  dataMax: number,
  options: NiceScaleOptions = {},
): NiceScale {
  const {
    tickCount = 5,
    baseline = "zero",
    baselineRatio = 0.35,
    minSpanRatio = 0.06,
    integer = false,
    headroomRatio = 0.05,
  } = options;

  let min = Math.min(dataMin, dataMax);
  let max = Math.max(dataMin, dataMax);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }

  // 全零 / 无信号: 给一个固定的最小量程, 网格仍然可读
  if (max <= 0) {
    return integer
      ? { domain: [0, 4], ticks: [0, 1, 2, 3, 4], step: 1 }
      : { domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1], step: 0.25 };
  }

  let lo = baseline === "zero" || min <= 0 || min < max * baselineRatio ? 0 : min;

  // 留白相对量程而非绝对值, 抬升基线时上下两端都留白
  let span = max - lo;
  const pad = span * headroomRatio;
  max += pad;
  if (lo > 0) lo = Math.max(0, lo - pad);

  // 平坦数据保护: 量程下限为峰值的一定比例, 避免把噪声放大成假波动
  span = max - lo;
  const minSpan = max * minSpanRatio;
  if (span < minSpan) {
    const mid = (lo + max) / 2;
    lo = Math.max(0, mid - minSpan / 2);
    max = lo + minSpan;
    span = max - lo;
  }

  let step = niceStep(span / (tickCount - 1));
  if (integer && step < 1) step = 1;
  // floor/ceil 取整后可能多出刻度, 过密时升一档步长
  while (Math.ceil(max / step - 1e-9) - Math.floor(lo / step + 1e-9) > tickCount + 1) {
    step = nextStepUp(step);
  }

  const decimals = stepDecimals(step);
  const first = Math.floor(lo / step + 1e-9);
  const last = Math.ceil(max / step - 1e-9);
  const ticks: number[] = [];
  for (let i = first; i <= last; i++) {
    ticks.push(Number((i * step).toFixed(decimals)));
  }
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks, step };
}

/** 百分比轴 (CPU / 内存 / 磁盘): 固定 0-100 */
export const PERCENT_SCALE: NiceScale = {
  domain: [0, 100],
  ticks: [0, 25, 50, 75, 100],
  step: 25,
};

/**
 * 丢包轴: 从预设档位中选首个容得下峰值的量程。
 * 下限 10% 避免把 1-2% 的轻微丢包放大成视觉警报, 上限 100% 对应全断。
 */
const LOSS_PRESETS: NiceScale[] = [
  { domain: [0, 10], ticks: [0, 5, 10], step: 5 },
  { domain: [0, 20], ticks: [0, 10, 20], step: 10 },
  { domain: [0, 50], ticks: [0, 25, 50], step: 25 },
  { domain: [0, 100], ticks: [0, 50, 100], step: 50 },
];

export function lossScale(maxLoss: number): NiceScale {
  return (
    LOSS_PRESETS.find((s) => maxLoss <= s.domain[1] * 0.9) ?? LOSS_PRESETS[LOSS_PRESETS.length - 1]
  );
}

/** 延迟轴: 域顶 < 1s 全用 ms, 否则全用 s, 小数位由步长决定 */
export function delayTickFormatter(scale: NiceScale): (v: number) => string {
  if (scale.domain[1] >= 1000) {
    const d = stepDecimals(scale.step / 1000);
    return (v) => `${(v / 1000).toFixed(d)}s`;
  }
  const d = stepDecimals(scale.step);
  return (v) => `${v.toFixed(d)}ms`;
}

/** 通用刻度格式化: 小数位由步长决定 */
export function tickFormat(scale: NiceScale, unit = ""): (v: number) => string {
  const d = stepDecimals(scale.step);
  return (v) => `${v.toFixed(d)}${unit}`;
}

/* ---------- 速率轴 (字节/秒) ---------- */

const SPEED_UNITS = [
  { unit: "B/s", factor: 1 },
  { unit: "KB/s", factor: 1024 },
  { unit: "MB/s", factor: 1024 ** 2 },
  { unit: "GB/s", factor: 1024 ** 3 },
] as const;

export interface SpeedScale extends NiceScale {
  unit: string;
  factor: number;
  /** 原始字节值 -> 显示单位数值字符串 (不带单位) */
  format: (raw: number) => string;
}

/** 按显示单位生成 nice 刻度 (刻度在 KB/MB/GB 数值上整洁), 再换算回原始字节域 */
export function speedScale(maxBytes: number): SpeedScale {
  const u =
    SPEED_UNITS.find((_, i) => {
      const next = SPEED_UNITS[i + 1];
      return !next || maxBytes < next.factor;
    }) ?? SPEED_UNITS[0];
  const s = niceScale(0, maxBytes / u.factor, { baseline: "zero" });
  const d = stepDecimals(s.step);
  return {
    domain: [s.domain[0] * u.factor, s.domain[1] * u.factor],
    ticks: s.ticks.map((t) => t * u.factor),
    step: s.step * u.factor,
    unit: u.unit,
    factor: u.factor,
    format: (raw) => (raw / u.factor).toFixed(d),
  };
}

/* ---------- 轴宽预算 ---------- */

/** 10px Geist Mono 等宽字符宽度 + 轴内边距 */
const TICK_CHAR_PX = 6;
const AXIS_PADDING = 8;

/** 由实际刻度标签精确预算 Y 轴宽度, 杜绝标签被截断 */
export function axisWidthFor(labels: string[], minWidth = 24): number {
  const longest = labels.reduce((n, l) => Math.max(n, l.length), 0);
  return Math.max(minWidth, longest * TICK_CHAR_PX + AXIS_PADDING);
}
