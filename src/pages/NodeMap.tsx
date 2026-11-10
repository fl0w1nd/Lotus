import { ArrowDown, ArrowUp, Cpu, Globe, MemoryStick, Server } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import worldDots from "@/assets/world-dots.json";
import { Flag } from "@/components/Flag";
import { OsIcon } from "@/components/OsIcon";
import { SegmentedBar } from "@/components/UsageBar";
import { useI18n } from "@/lib/i18n";
import {
  cn,
  formatBytes,
  formatSpeed,
  isServerOnline,
  memPercent,
  platformName,
} from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";
import type { NezhaServer } from "@/types/nezha";

const DOT_R = 0.35;

interface CountryAgg {
  code: string;
  x: number;
  y: number;
  online: number;
  total: number;
  servers: (NezhaServer & { online: boolean })[];
}

export default function NodeMapPage() {
  const { snapshot } = useNezhaWS();
  const { t, lang } = useI18n();

  // 鼠标悬停的国家/地区(仅用于地图顶栏实时预览，不触发下方列表卸载跳动)
  const [hoveredCountry, setHoveredCountry] = useState<CountryAgg | null>(null);

  // 当前选中的国家（未手动选择时默认选中节点最多的首个地区）
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

  // 陆地底图点阵 path 合并
  const basePath = useMemo(() => {
    const r = DOT_R;
    return (worldDots.dots as number[][])
      .map(([x, y]) => `M${x} ${y}m${-r},0a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`)
      .join("");
  }, []);

  const servers = snapshot?.servers ?? [];
  const now = snapshot?.now ?? Date.now();

  // 聚合各国家/地区的服务器状态
  const countries = useMemo<CountryAgg[]>(() => {
    if (!servers.length) return [];
    const table = worldDots.countries as Record<string, number[]>;
    const agg = new Map<string, CountryAgg>();

    for (const s of servers) {
      const code = (s.country_code || "").toUpperCase();
      const pos = table[code];
      if (!pos) continue;

      const cur = agg.get(code) ?? {
        code,
        x: pos[0],
        y: pos[1],
        online: 0,
        total: 0,
        servers: [],
      };

      cur.total += 1;
      const online = isServerOnline(now, s);
      if (online) cur.online += 1;
      cur.servers.push({ ...s, online });
      agg.set(code, cur);
    }

    return [...agg.values()].sort((a, b) => b.total - a.total);
  }, [servers, now]);

  // 大盘统计
  const stats = useMemo(() => {
    const totalServers = servers.length;
    const onlineServers = servers.filter((s) => isServerOnline(now, s)).length;
    const totalRegions = countries.length;

    let sumCpu = 0;
    let sumMem = 0;
    let onlineCount = 0;

    for (const s of servers) {
      if (isServerOnline(now, s)) {
        sumCpu += s.state.cpu;
        sumMem += memPercent(s);
        onlineCount += 1;
      }
    }

    return {
      totalServers,
      onlineServers,
      offlineServers: totalServers - onlineServers,
      onlineRate: totalServers ? Math.round((onlineServers / totalServers) * 100) : 0,
      avgCpu: onlineCount ? Math.round(sumCpu / onlineCount) : 0,
      avgMem: onlineCount ? Math.round(sumMem / onlineCount) : 0,
      totalRegions,
    };
  }, [servers, countries, now]);

  if (!snapshot) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }

  const effectiveCode = selectedCountryCode ?? countries[0]?.code ?? null;
  const activeCountry = countries.find((c) => c.code === effectiveCode) ?? countries[0] ?? null;
  const previewCountry = hoveredCountry ?? activeCountry;

  return (
    <div className="flex flex-col gap-4 pt-5 lg:grid lg:grid-cols-12">
      {/* 左侧态势面板 (占 4 列) */}
      <div className="flex flex-col gap-4 lg:col-span-4">
        {/* 核心指标看板 */}
        <div className="card flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-fg">
                {lang === "zh-CN" ? "全球节点态势" : "Global Fleet Posture"}
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {lang === "zh-CN" ? "实时地理分布与负载均值" : "Live Regional Telemetry"}
              </p>
            </div>
            <span className="badge-chip rounded-md px-2 py-0.5 font-mono text-[10px] font-medium text-muted">
              {stats.totalRegions} {t("regions")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="card-well flex flex-col gap-1 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
                <Server size={11} className="text-up" />
                {t("online")}
              </span>
              <span className="tnum font-mono text-xl font-semibold tracking-tight text-fg">
                <span className="text-up">{stats.onlineServers}</span>{" "}
                <span className="text-xs font-normal text-faint">/ {stats.totalServers}</span>
              </span>
            </div>
            <div className="card-well flex flex-col gap-1 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
                <Globe size={11} className="text-accent" />
                {t("regionsLabel")}
              </span>
              <span className="tnum font-mono text-xl font-semibold tracking-tight text-fg">
                {stats.totalRegions}{" "}
                <span className="text-xs font-normal text-faint">{t("regions")}</span>
              </span>
            </div>
          </div>

          {/* 圆环在线率 & CPU/内存平均负载 */}
          <div className="flex items-center gap-5 border-t border-line pt-4">
            <div className="relative size-16 shrink-0">
              <svg viewBox="0 0 36 36" className="size-full">
                <title>Online Rate</title>
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className="stroke-line"
                  strokeWidth="2.8"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className="stroke-up transition-all duration-1000"
                  strokeWidth="2.8"
                  strokeDasharray={`${stats.onlineRate} ${100 - stats.onlineRate}`}
                  strokeDashoffset="25"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="tnum font-mono text-xs font-semibold leading-none tracking-tight text-fg">
                  {stats.onlineRate}%
                </span>
                <span className="mt-0.5 text-[9px] text-faint">
                  {lang === "zh-CN" ? "在线率" : "Online"}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-muted">
                    <Cpu size={11} className="text-c-cpu" />
                    AVG {t("cpu")}
                  </span>
                  <span className="tnum font-semibold text-fg">{stats.avgCpu}%</span>
                </div>
                <SegmentedBar
                  percent={stats.avgCpu}
                  fill="var(--color-c-cpu)"
                  segments={18}
                  size="sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-muted">
                    <MemoryStick size={11} className="text-c-mem" />
                    AVG {t("memory")}
                  </span>
                  <span className="tnum font-semibold text-fg">{stats.avgMem}%</span>
                </div>
                <SegmentedBar
                  percent={stats.avgMem}
                  fill="var(--color-c-mem)"
                  segments={18}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 区域列表 */}
        <div className="card flex max-h-[360px] flex-1 flex-col gap-2 overflow-y-auto p-3 no-scrollbar lg:max-h-[480px]">
          <div className="flex items-center justify-between border-b border-line px-2 pb-2 pt-0.5">
            <span className="text-[11px] font-semibold text-muted">
              {lang === "zh-CN" ? "地区分布列表" : "Regions"}
            </span>
            <span className="font-mono text-[10px] text-faint">
              {lang === "zh-CN" ? "点击切换节点明细" : "Select to inspect"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {countries.map((c) => {
              const isSelected = activeCountry?.code === c.code;
              const statusColor =
                c.online === c.total
                  ? "var(--color-up)"
                  : c.online > 0
                    ? "var(--color-warn)"
                    : "var(--color-down)";
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCountryCode(c.code)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition-all",
                    isSelected
                      ? "border-accent/30 bg-accent/10 font-medium text-fg shadow-2xs"
                      : "border-transparent text-muted hover:bg-surface-inset hover:text-fg-2",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Flag code={c.code} className="text-sm shrink-0" />
                    <span className="font-mono font-medium tracking-tight">{c.code}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="tnum font-mono text-[11px] text-muted">
                      {c.online}
                      <span className="text-faint">/{c.total}</span>
                    </span>
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: statusColor }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧地图与地区节点面板 (占 8 列) */}
      <div className="flex flex-col gap-4 lg:col-span-8">
        {/* 地图卡片 */}
        <div className="card relative flex flex-col overflow-hidden p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-fg">
                {lang === "zh-CN" ? "全球节点地理分布" : "Global Node Distribution"}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {lang === "zh-CN" ? "点选信标切换地区" : "Click beacon to lock region"}
              </span>
            </div>

            {previewCountry && (
              <div className="card-well flex items-center gap-2 px-2.5 py-1 text-xs">
                <Flag code={previewCountry.code} className="text-xs" />
                <span className="font-mono font-semibold text-fg">{previewCountry.code}</span>
                <span className="h-3 w-px bg-line" />
                <span className="tnum font-mono text-[11px] text-muted">
                  <span className="text-up font-medium">{previewCountry.online}</span> /{" "}
                  {previewCountry.total} {t("online")}
                </span>
              </div>
            )}
          </div>

          {/* 地图 2D Flat 容器 */}
          <div className="flex w-full items-center justify-center overflow-visible py-4">
            <div className="w-full origin-center overflow-visible">
              <svg
                viewBox={`0 6 ${worldDots.w} ${worldDots.h - 14}`}
                className="block w-full overflow-visible transition-colors duration-500"
                role="img"
                aria-label={t("map")}
              >
                {/* 陆地点阵底图 */}
                <path
                  d={basePath}
                  className="fill-fg opacity-[0.11] transition-all duration-500 dark:opacity-[0.14]"
                />

                {/* 各区域节点圆点与雷达波纹(支持全在线绿 / 部分离线黄 / 全离线红三态) */}
                {countries.map((c) => {
                  const isActive =
                    activeCountry?.code === c.code || hoveredCountry?.code === c.code;
                  const dotColor =
                    c.online === c.total
                      ? "var(--color-up)"
                      : c.online > 0
                        ? "var(--color-warn)"
                        : "var(--color-down)";

                  return (
                    // biome-ignore lint/a11y/useSemanticElements: SVG elements cannot use button semantic element
                    <g
                      key={c.code}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer outline-none"
                      onMouseEnter={() => setHoveredCountry(c)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => setSelectedCountryCode(c.code)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedCountryCode(c.code);
                        }
                      }}
                    >
                      {c.online > 0 && (
                        <>
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r={0.8}
                            fill={dotColor}
                            opacity={isActive ? 0.85 : 0.45}
                          >
                            <animate
                              attributeName="r"
                              values="0.8;3.4"
                              dur="2.5s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.55;0"
                              dur="2.5s"
                              repeatCount="indefinite"
                            />
                          </circle>
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r={0.8}
                            fill={dotColor}
                            opacity={isActive ? 0.65 : 0.35}
                          >
                            <animate
                              attributeName="r"
                              values="0.8;3.4"
                              dur="2.5s"
                              begin="1.25s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.4;0"
                              dur="2.5s"
                              begin="1.25s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        </>
                      )}

                      {/* 核心在线/离线物理圆点 */}
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={isActive ? 1.15 : 0.72}
                        fill={dotColor}
                        className="stroke-surface transition-all duration-300"
                        strokeWidth={isActive ? 0.35 : 0.15}
                      />

                      {/* 热区透明占位圆，提升触控和悬浮交互敏感度 */}
                      <circle cx={c.x} cy={c.y} r={3.2} fill="transparent" />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* 区域服务器详情卡片(可直接点击跳转进入单机详情页) */}
        {activeCountry && (
          <div className="card flex flex-col gap-3.5 p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <Flag code={activeCountry.code} className="text-lg" />
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-fg">
                    {lang === "zh-CN" ? "地区节点明细" : "Region Nodes"} · {activeCountry.code}
                  </h3>
                  <p className="tnum font-mono text-[10.5px] text-muted">
                    {activeCountry.online} {t("online")} / {activeCountry.total}{" "}
                    {lang === "zh-CN" ? "台服务器" : "servers"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeCountry.servers.map((s) => {
                const memPct = memPercent(s);
                return (
                  <Link
                    key={s.id}
                    to={`/server/${s.id}`}
                    className={cn(
                      "card-well group flex flex-col gap-2.5 p-3.5 transition-all hover:border-line-strong hover:bg-surface",
                      !s.online && " opacity-60 saturate-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <OsIcon platform={s.host.platform} className="size-3.5 shrink-0" />
                        <span className="truncate text-xs font-semibold text-fg transition-colors group-hover:text-accent">
                          {s.name}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-medium",
                          s.online
                            ? "border-up/25 bg-up/10 text-up"
                            : "border-down/25 bg-down/10 text-down",
                        )}
                      >
                        <span
                          className={cn("size-1 rounded-full", s.online ? "bg-up" : "bg-down")}
                        />
                        {s.online ? t("online") : t("offline")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-faint">{t("cpu")}</span>
                          <span className="tnum font-medium text-fg-2">
                            {s.state.cpu.toFixed(0)}%
                          </span>
                        </div>
                        <SegmentedBar
                          percent={s.state.cpu}
                          fill={
                            s.state.cpu >= 90
                              ? "var(--color-down)"
                              : s.state.cpu >= 75
                                ? "var(--color-warn)"
                                : "var(--color-c-cpu)"
                          }
                          segments={12}
                          size="sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-faint">{t("memory")}</span>
                          <span className="tnum font-medium text-fg-2">{memPct.toFixed(0)}%</span>
                        </div>
                        <SegmentedBar
                          percent={memPct}
                          fill={
                            memPct >= 90
                              ? "var(--color-down)"
                              : memPct >= 75
                                ? "var(--color-warn)"
                                : "var(--color-c-mem)"
                          }
                          segments={12}
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="tnum flex items-center justify-between border-t border-line/70 pt-2 font-mono text-[10.5px] text-muted">
                      <span className="truncate text-faint">
                        {platformName(s.host.platform)} · {formatBytes(s.host.mem_total)}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex items-center gap-0.5">
                          <ArrowUp size={10} className="text-c-out" />
                          {formatSpeed(s.state.net_out_speed)}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <ArrowDown size={10} className="text-c-in" />
                          {formatSpeed(s.state.net_in_speed)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
