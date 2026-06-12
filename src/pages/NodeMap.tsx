import { useMemo, useState } from "react";
import worldDots from "@/assets/world-dots.json";
import { Flag } from "@/components/Flag";
import { OsIcon } from "@/components/OsIcon";
import { useI18n } from "@/lib/i18n";
import { cn, formatBytes, isServerOnline, memPercent } from "@/lib/utils";
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

  // 鼠标悬停的国家/地区
  const [hoveredCountry, setHoveredCountry] = useState<CountryAgg | null>(null);

  // 当前手动高亮的国家（点击左侧列表行时）
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

  // 被聚焦高亮的国家 (鼠标悬停优先，其次为左侧点击选择)
  const activeCountry = hoveredCountry || countries.find((c) => c.code === selectedCountryCode);

  return (
    <div className="flex flex-col gap-5 pt-5 lg:grid lg:grid-cols-12">
      {/* 左侧 HUD 统计大盘 (占 4 列) */}
      <div className="flex flex-col gap-4 lg:col-span-4">
        {/* 核心指标看板 */}
        <div className="card p-5 flex flex-col gap-5 bg-gradient-to-b from-surface to-surface-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-fg-2 uppercase">
              HUD Dashboard
            </h2>
            <p className="text-[11px] text-faint font-mono">GLOBAL AGENTS SNAPSHOT</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col border-l border-line pl-3">
              <span className="text-[10px] text-muted tracking-wider uppercase font-medium">
                {t("online")} / {lang === "zh-CN" ? "总数" : "Total"}
              </span>
              <span className="text-xl font-semibold tracking-tight text-fg">
                {stats.onlineServers}{" "}
                <span className="text-xs text-faint">/ {stats.totalServers}</span>
              </span>
            </div>
            <div className="flex flex-col border-l border-line pl-3">
              <span className="text-[10px] text-muted tracking-wider uppercase font-medium">
                {t("regions")}
              </span>
              <span className="text-xl font-semibold tracking-tight text-fg">
                {stats.totalRegions}{" "}
                <span className="text-xs text-faint">
                  {lang === "zh-CN" ? "个地区" : "regions"}
                </span>
              </span>
            </div>
          </div>

          {/* 圆环在线率 & CPU/内存平均负载 */}
          <div className="flex items-center gap-6 border-t border-line/80 pt-4">
            {/* SVG 极简进度圆环 */}
            <div className="relative size-16 shrink-0">
              <svg viewBox="0 0 36 36" className="size-full">
                <title>Online Rate</title>
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className="stroke-line"
                  strokeWidth="2.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  className="stroke-up transition-all duration-1000"
                  strokeWidth="2.5"
                  strokeDasharray={`${stats.onlineRate} ${100 - stats.onlineRate}`}
                  strokeDashoffset="25"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-semibold text-fg tracking-tight leading-none">
                  {stats.onlineRate}%
                </span>
                <span className="text-[8px] text-faint scale-90">
                  {lang === "zh-CN" ? "在线率" : "Online"}
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                  <span>AVG CPU</span>
                  <span className="text-fg font-medium">{stats.avgCpu}%</span>
                </div>
                <div className="h-1 w-full bg-line rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-c-cpu rounded-full"
                    style={{ width: `${stats.avgCpu}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                  <span>AVG MEM</span>
                  <span className="text-fg font-medium">{stats.avgMem}%</span>
                </div>
                <div className="h-1 w-full bg-line rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-c-mem rounded-full"
                    style={{ width: `${stats.avgMem}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 区域列表 - HUD Panel */}
        <div className="card p-3 flex flex-col gap-2 flex-1 max-h-[350px] lg:max-h-[480px] overflow-y-auto no-scrollbar">
          <div className="px-2 py-1 border-b border-line pb-2 mb-1">
            <span className="text-[10px] font-semibold text-faint tracking-wider uppercase">
              {lang === "zh-CN" ? "地区明细" : "REGION LIST"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {countries.map((c) => {
              const isSelected = selectedCountryCode === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCountryCode(isSelected ? null : c.code)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all text-xs border border-transparent",
                    isSelected
                      ? "bg-accent/10 border-accent/20 text-fg font-medium"
                      : "hover:bg-surface-2 text-muted hover:text-fg-2",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Flag code={c.code} className="text-sm shrink-0" />
                    <span className="font-mono tracking-tight">{c.code}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-faint">
                      {c.online}/{c.total}
                    </span>
                    <span
                      className={cn(
                        "size-1.5 rounded-full shrink-0",
                        c.online === c.total ? "bg-up" : c.online > 0 ? "bg-warn" : "bg-down",
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧地图与全息面板 (占 8 列) */}
      <div className="flex flex-col gap-4 lg:col-span-8">
        {/* 地图卡片 */}
        <div className="card overflow-hidden flex flex-col p-4 bg-gradient-to-b from-surface to-surface-2 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-widest text-faint uppercase">
                GEOGRAPHIC DISTRIBUTE
              </span>
              <span className="text-xs font-semibold text-fg-2">
                {lang === "zh-CN" ? "全球节点地理分布" : "Global Node Distribution"}
              </span>
            </div>
          </div>

          {/* 地图 2D Flat 容器 */}
          <div className="w-full flex items-center justify-center py-6 overflow-visible">
            <div className="w-full origin-center overflow-visible">
              <svg
                viewBox={`0 6 ${worldDots.w} ${worldDots.h - 14}`}
                className="block w-full overflow-visible transition-colors duration-500"
                role="img"
                aria-label={t("map")}
              >
                {/* 陆地点阵底图: 亮色与暗色自适应 */}
                <path
                  d={basePath}
                  className="fill-fg opacity-[0.08] dark:opacity-[0.12] transition-all duration-500"
                />

                {/* 各区域节点圆点与雷达波纹 */}
                {countries.map((c) => {
                  const isOk = c.online > 0;
                  const isHovered = activeCountry?.code === c.code;
                  const dotColor = isOk ? "var(--color-up)" : "var(--color-down)";

                  return (
                    // biome-ignore lint/a11y/useSemanticElements: SVG elements cannot use button semantic element
                    <g
                      key={c.code}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer outline-none"
                      onMouseEnter={() => setHoveredCountry(c)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() =>
                        setSelectedCountryCode(selectedCountryCode === c.code ? null : c.code)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedCountryCode(selectedCountryCode === c.code ? null : c.code);
                        }
                      }}
                    >
                      {/* 雷达波纹 - 双层动画涟漪 */}
                      {isOk && (
                        <>
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r={0.75}
                            fill={dotColor}
                            opacity={isHovered ? 0.8 : 0.45}
                          >
                            <animate
                              attributeName="r"
                              values="0.75;3.2"
                              dur="2.5s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.5;0"
                              dur="2.5s"
                              repeatCount="indefinite"
                            />
                          </circle>
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r={0.75}
                            fill={dotColor}
                            opacity={isHovered ? 0.6 : 0.35}
                          >
                            <animate
                              attributeName="r"
                              values="0.75;3.2"
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
                        r={isHovered ? 1.0 : 0.65}
                        fill={dotColor}
                        className="transition-all duration-300 stroke-surface"
                        strokeWidth={isHovered ? 0.3 : 0}
                      />

                      {/* 热区透明占位圆，提升触控和悬浮交互敏感度 */}
                      <circle cx={c.x} cy={c.y} r={3} fill="transparent" />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* 区域服务器 HUD 详情卡片 */}
        {activeCountry ? (
          <div className="card p-4 flex flex-col gap-3 bg-gradient-to-b from-surface to-surface-2 animate-fade-in">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <Flag code={activeCountry.code} className="text-lg" />
                <div>
                  <h3 className="text-sm font-semibold text-fg tracking-tight">
                    {lang === "zh-CN" ? "地区节点明细" : "Region Nodes"} ({activeCountry.code})
                  </h3>
                  <p className="text-[10px] text-faint font-mono">
                    STATUS: {activeCountry.online} ONLINE / {activeCountry.total} TOTAL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHoveredCountry(null);
                  setSelectedCountryCode(null);
                }}
                className="text-[10px] font-mono text-muted hover:text-fg hover:bg-surface-2 px-2 py-0.5 rounded transition-all"
              >
                CLOSE [X]
              </button>
            </div>

            {/* 服务器网格/列表 */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {activeCountry.servers.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 transition-all",
                    !s.online && "opacity-60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-fg truncate max-w-[150px]">
                      {s.name}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium border",
                        s.online
                          ? "border-up/20 bg-up/10 text-up"
                          : "border-down/20 bg-down/10 text-down",
                      )}
                    >
                      <span className={cn("size-1 rounded-full", s.online ? "bg-up" : "bg-down")} />
                      {s.online ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>

                  {s.online && (
                    <div className="flex flex-col gap-1 text-[10px] font-mono text-muted">
                      <div className="flex items-center gap-1.5 truncate">
                        <OsIcon platform={s.host.platform} className="size-3 shrink-0" />
                        <span>
                          {s.host.arch} · {formatBytes(s.host.mem_total)} RAM
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span>CPU: {s.state.cpu.toFixed(0)}%</span>
                        <span>NET: ↑{formatBytes(s.state.net_out_speed)}/s</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-8 flex flex-col items-center justify-center text-center py-12">
            <svg viewBox="0 0 16 16" fill="none" className="size-8 text-faint mb-2.5 opacity-60">
              <title>Info Icon</title>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M8 4.5v4.5M8 11.5h.01"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-xs font-medium text-fg-2">
              {lang === "zh-CN" ? "请悬停或点击地图节点" : "Hover or click a node on the map"}
            </p>
            <p className="text-[10px] text-faint mt-1">
              {lang === "zh-CN"
                ? "可查看对应地区的服务器详情数据"
                : "To inspect server statistics of specific region"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
