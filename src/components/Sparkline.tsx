import { useId, useMemo } from "react";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** 固定 Y 轴上限;不传则取数据最大值 */
  max?: number;
  className?: string;
  strokeWidth?: number;
}

/** Catmull-Rom 转 Bezier 的平滑曲线迷你图,继承 currentColor */
export function Sparkline({
  values,
  width = 120,
  height = 36,
  max,
  className,
  strokeWidth = 1.5,
}: SparklineProps) {
  const gid = useId();

  const { line, area, end } = useMemo(() => {
    if (values.length < 2) return { line: "", area: "", end: null as [number, number] | null };
    const padY = strokeWidth + 1;
    const top = max ?? Math.max(...values, 1e-9);
    const pts = values.map((v, i) => [
      (i / (values.length - 1)) * width,
      height - padY - Math.min(v / top, 1) * (height - padY * 2),
    ]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    const a = `${d} L ${width} ${height} L 0 ${height} Z`;
    return { line: d, area: a, end: pts[pts.length - 1] as [number, number] };
  }, [values, width, height, max, strokeWidth]);

  if (!line) return <div className={className} style={{ width, height }} />;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {end && <circle cx={end[0]} cy={end[1]} r={strokeWidth + 0.75} fill="currentColor" />}
    </svg>
  );
}
