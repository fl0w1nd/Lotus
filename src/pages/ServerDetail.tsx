import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Gauge,
  HardDrive,
  Layers,
  MemoryStick,
  Network,
  Thermometer,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HistoryChart } from "@/components/detail/HistoryChart";
import { PingChart } from "@/components/detail/PingChart";
import { RealtimeCharts } from "@/components/detail/RealtimeCharts";
import { Flag } from "@/components/Flag";
import { OsIcon } from "@/components/OsIcon";
import { SegmentedBar } from "@/components/UsageBar";
import { fetchSetting } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  billingDaysLeft,
  cn,
  cpuCoreCount,
  diskPercent,
  formatBytes,
  formatUptime,
  type GpuInfo,
  gpuInfos,
  isServerOnline,
  memPercent,
  parsePublicNote,
  platformName,
} from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";

function Tile({
  icon,
  label,
  value,
  sub,
  accent,
  percent,
  tone = "var(--color-fg-2)",
  className,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
  percent?: number;
  tone?: string;
  className?: string;
}) {
  const p = percent !== undefined ? Math.min(Math.max(percent, 0), 100) : undefined;
  const fill =
    p !== undefined ? (p >= 90 ? "var(--color-down)" : p >= 75 ? "var(--color-warn)" : tone) : tone;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-between gap-2 bg-surface px-4 py-3.5",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          {icon && (
            <span
              className="flex size-4 shrink-0 items-center justify-center rounded-[4px]"
              style={{
                color: fill,
                background: `color-mix(in oklab, ${fill} 12%, transparent)`,
              }}
            >
              {icon}
            </span>
          )}
          <span className="truncate">{label}</span>
        </span>
        <span className={cn("tnum font-mono text-[16px] font-semibold leading-tight", accent)}>
          {value}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {p !== undefined && <SegmentedBar percent={p} fill={fill} segments={14} size="sm" />}
        {sub && <span className="tnum truncate font-mono text-[10px] text-faint">{sub}</span>}
      </div>
    </div>
  );
}

/** 第 9 块瓦片占满整行:逐卡利用率 + 显存(v2.3.9+,厂商不上报时省略) */
function GpuTile({ gpus }: { gpus: GpuInfo[] }) {
  const { t } = useI18n();
  return (
    <div className="col-span-2 flex min-w-0 flex-col gap-2.5 bg-surface px-4 py-3.5 sm:col-span-4 xl:col-span-8">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
        <span
          className="flex size-4 shrink-0 items-center justify-center rounded-[4px] text-accent"
          style={{ background: "color-mix(in oklab, var(--color-accent) 12%, transparent)" }}
        >
          <Cpu size={10.5} strokeWidth={2.2} />
        </span>
        {t("gpu")}
      </span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {gpus.map((g, i) => {
          const memPct = g.memTotal ? Math.min((g.memUsed / g.memTotal) * 100, 100) : 0;
          const fill =
            memPct >= 90
              ? "var(--color-down)"
              : memPct >= 75
                ? "var(--color-warn)"
                : "var(--color-c-mem)";
          return (
            <div key={i} className="card-well flex min-w-0 flex-col gap-1.5 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="tnum flex items-baseline gap-1.5 font-mono text-[14px] font-semibold leading-tight text-fg">
                  {gpus.length > 1 && <span className="text-[10px] text-faint">#{i}</span>}
                  {g.utilization.toFixed(0)}%
                </span>
                {g.name && (
                  <span className="truncate font-mono text-[10px] text-muted" title={g.name}>
                    {g.name}
                  </span>
                )}
              </div>
              {g.memTotal > 0 ? (
                <>
                  <SegmentedBar percent={memPct} fill={fill} segments={18} size="sm" />
                  <span className="tnum truncate font-mono text-[10px] text-faint">
                    {t("vram")} {formatBytes(g.memUsed)} / {formatBytes(g.memTotal)} (
                    {memPct.toFixed(0)}%)
                  </span>
                </>
              ) : (
                <SegmentedBar
                  percent={g.utilization}
                  fill="var(--color-accent)"
                  segments={18}
                  size="sm"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function tempColor(c: number): string {
  if (c >= 75) return "text-down";
  if (c >= 55) return "text-warn";
  return "text-c-in";
}

/** 温度传感器条:内嵌微舱 + 名称 + 数值,按温度着色 */
function TemperatureStrip({ temps }: { temps: { Name: string; Temperature: number }[] }) {
  const { t } = useI18n();
  const sorted = [...temps]
    .filter((s) => s.Temperature > 0)
    .sort((a, b) => b.Temperature - a.Temperature);
  if (!sorted.length) return null;

  return (
    <div className="card flex flex-col gap-2.5 p-4">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
        <Thermometer size={12} className="text-c-out" />
        {t("temperature")}
      </span>
      <div className="flex flex-wrap gap-2">
        {sorted.map((s) => (
          <div
            key={s.Name}
            className="card-well flex items-center gap-2 px-2.5 py-1.5"
            title={s.Name}
          >
            <span className="max-w-36 truncate font-mono text-[10.5px] text-muted">{s.Name}</span>
            <span className="h-3 w-px bg-line" />
            <span className={cn("tnum font-mono text-xs font-semibold", tempColor(s.Temperature))}>
              {s.Temperature.toFixed(0)}°C
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({
  children,
  title,
  accent,
}: {
  children: ReactNode;
  title?: string;
  accent?: boolean;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 break-words rounded-md px-2 py-1 font-mono text-[10.5px] leading-none",
        accent
          ? "border border-accent/25 bg-accent/10 font-medium text-accent"
          : "badge-chip text-muted",
      )}
    >
      {children}
    </span>
  );
}

export default function ServerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const serverId = Number(id);
  const { snapshot } = useNezhaWS();
  const { t, lang } = useI18n();

  const { data: setting } = useQuery({
    queryKey: ["setting"],
    queryFn: fetchSetting,
  });
  const tsdbEnabled = setting?.data?.tsdb_enabled === true;

  const servers = snapshot?.servers ?? [];
  const serverIndex = useMemo(
    () => servers.findIndex((s) => s.id === serverId),
    [servers, serverId],
  );
  const server = serverIndex >= 0 ? servers[serverIndex] : undefined;
  const prevServer =
    servers.length > 1 && serverIndex >= 0
      ? servers[(serverIndex - 1 + servers.length) % servers.length]
      : null;
  const nextServer =
    servers.length > 1 && serverIndex >= 0 ? servers[(serverIndex + 1) % servers.length] : null;

  // 支持键盘 [ / ] 快速切换前后服务器
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      if (e.key === "[" && prevServer) {
        navigate(`/server/${prevServer.id}`);
      } else if (e.key === "]" && nextServer) {
        navigate(`/server/${nextServer.id}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevServer, nextServer, navigate]);

  if (!snapshot) {
    return (
      <div className="flex flex-col gap-3 pt-5">
        <div className="card h-28 animate-pulse" />
        <div className="card h-44 animate-pulse" />
      </div>
    );
  }

  if (!server) {
    return (
      <div className="card mt-5 flex flex-col items-center gap-3 py-20">
        <p className="text-sm text-fg-2">{t("notFound")}</p>
        <Link to="/" className="text-xs text-accent hover:underline">
          ← {t("backHome")}
        </Link>
      </div>
    );
  }

  const online = isServerOnline(snapshot.now, server);
  const note = parsePublicNote(server.public_note);
  const billing = note?.billingDataMod;
  const plan = note?.planDataMod;

  const daysLeft = billingDaysLeft(billing);

  const cpuModel = server.host.cpu?.join(" / ") || "—";
  const cores = cpuCoreCount(server.host.cpu);
  const loadPct = cores ? Math.min((server.state.load_1 / cores) * 100, 100) : undefined;
  // 负载相对核心数着色;核心数未知则保持中性
  const loadAccent =
    cores && server.state.load_1 >= cores
      ? "text-down"
      : cores && server.state.load_1 >= cores * 0.7
        ? "text-warn"
        : undefined;
  const swapPct = server.host.swap_total
    ? (server.state.swap_used / server.host.swap_total) * 100
    : undefined;
  const gpus = gpuInfos(server);
  const temps = server.state.temperatures ?? [];

  const truncateString = (str: string, maxLen = 36): string => {
    if (!str) return "";
    if (str.length <= maxLen) return str;
    return `${str.slice(0, maxLen)}…`;
  };

  return (
    <div className="flex flex-col gap-3.5 pt-5">
      {/* 顶部导航条(返回总览 + 前后服务器快速切换) + 标题区 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-1 rounded-md border border-transparent px-1.5 py-1 -ml-1.5 text-xs text-muted transition-colors hover:border-line hover:bg-surface hover:text-fg"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            {t("backHome")}
          </Link>

          {prevServer && nextServer && (
            <div className="flex items-center gap-1">
              <Link
                to={`/server/${prevServer.id}`}
                title={`${prevServer.name} ([)`}
                className="badge-chip inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <ChevronLeft size={13} />
                <Flag code={prevServer.country_code} className="text-[11px]" />
                <span className="hidden max-w-24 truncate sm:inline">{prevServer.name}</span>
              </Link>
              <Link
                to={`/server/${nextServer.id}`}
                title={`${nextServer.name} (])`}
                className="badge-chip inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <span className="hidden max-w-24 truncate sm:inline">{nextServer.name}</span>
                <Flag code={nextServer.country_code} className="text-[11px]" />
                <ChevronRight size={13} />
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Flag code={server.country_code} className="text-xl" />
          <h1 className="text-xl font-semibold tracking-tight">{server.name}</h1>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              online ? "border-up/25 bg-up/10 text-up" : "border-down/25 bg-down/10 text-down",
            )}
          >
            <span className={cn("size-1.5 rounded-full", online ? "bg-up" : "bg-down")} />
            {online ? t("online") : t("offline")}
          </span>
          {!online && !server.last_active.startsWith("000") && (
            <span className="tnum font-mono text-[10.5px] text-faint">
              {t("lastActive")} {new Date(server.last_active).toLocaleString()}
            </span>
          )}
          {daysLeft !== null && (
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-semibold",
                daysLeft < 0
                  ? "border-down/25 bg-down/15 text-down animate-pulse-urgent"
                  : daysLeft <= 3
                    ? "border-down/20 bg-down/10 text-down animate-pulse-urgent"
                    : daysLeft <= 7
                      ? "border-warn/25 bg-warn/12 text-warn animate-pulse-soft"
                      : daysLeft <= 14
                        ? "border-warn/15 bg-warn/8 text-warn"
                        : daysLeft <= 30
                          ? "badge-chip text-muted"
                          : "badge-chip text-faint",
              )}
            >
              {billing?.amount && billing.amount !== "0"
                ? `${billing.amount}${billing.cycle ? `/${billing.cycle}` : ""} · `
                : billing?.amount === "0"
                  ? `${t("free")} · `
                  : ""}
              {daysLeft < 0 ? t("expired") : `${daysLeft} ${t("daysLeft")}`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip>
            <OsIcon platform={server.host.platform} className="size-3 opacity-90" />
            {platformName(server.host.platform)}
            {server.host.platform_version ? ` ${server.host.platform_version}` : ""}
          </Chip>
          {server.host.arch && <Chip>{server.host.arch}</Chip>}
          {server.host.virtualization && (
            <Chip title={t("virtualization")}>{server.host.virtualization}</Chip>
          )}
          <Chip title={cpuModel}>{truncateString(cpuModel)}</Chip>
          {server.host.gpu?.length > 0 && (
            <Chip title={server.host.gpu.join(" / ")}>{truncateString(server.host.gpu[0])}</Chip>
          )}
          {server.host.version && <Chip>agent v{server.host.version}</Chip>}
          {plan?.networkRoute && <Chip accent>{plan.networkRoute}</Chip>}
          {plan?.bandwidth && <Chip>{plan.bandwidth}</Chip>}
          {plan?.trafficVol && <Chip>{plan.trafficVol}</Chip>}
          {plan?.IPv4 === "1" && <Chip>IPv4</Chip>}
          {plan?.IPv6 === "1" && <Chip>IPv6</Chip>}
          {plan?.extra && <Chip>{plan.extra}</Chip>}
        </div>
      </div>

      {/* 实时指标瓦片:gap-px 露出底层线色,天然形成精密网格,含微型分段进度条 */}
      <section
        className={cn(
          "card grid grid-cols-2 gap-px overflow-hidden !bg-line p-0 sm:grid-cols-4 xl:grid-cols-8",
          !online && "opacity-75 saturate-50",
        )}
      >
        <Tile
          icon={<Cpu size={10.5} strokeWidth={2.2} />}
          label={t("cpu")}
          value={`${server.state.cpu.toFixed(1)}%`}
          percent={server.state.cpu}
          tone="var(--color-c-cpu)"
          sub={cores ? `${cores} ${lang === "zh-CN" ? "物理/逻辑核心" : "Cores"}` : undefined}
        />
        <Tile
          icon={<MemoryStick size={10.5} strokeWidth={2.2} />}
          label={t("memory")}
          value={`${memPercent(server).toFixed(1)}%`}
          percent={memPercent(server)}
          tone="var(--color-c-mem)"
          sub={`${formatBytes(server.state.mem_used)} / ${formatBytes(server.host.mem_total)}`}
        />
        <Tile
          icon={<Layers size={10.5} strokeWidth={2.2} />}
          label={t("swap")}
          value={swapPct !== undefined ? `${swapPct.toFixed(1)}%` : "—"}
          percent={swapPct}
          tone="var(--color-c-mem)"
          sub={
            server.host.swap_total
              ? `${formatBytes(server.state.swap_used)} / ${formatBytes(server.host.swap_total)}`
              : lang === "zh-CN"
                ? "未启用交换分区"
                : "Swap disabled"
          }
        />
        <Tile
          icon={<HardDrive size={10.5} strokeWidth={2.2} />}
          label={t("disk")}
          value={`${diskPercent(server).toFixed(1)}%`}
          percent={diskPercent(server)}
          tone="var(--color-c-disk)"
          sub={`${formatBytes(server.state.disk_used)} / ${formatBytes(server.host.disk_total)}`}
        />
        <Tile
          icon={<Gauge size={10.5} strokeWidth={2.2} />}
          label={t("load")}
          value={server.state.load_1.toFixed(2)}
          percent={loadPct}
          tone="var(--color-accent)"
          sub={`5m ${server.state.load_5.toFixed(2)} · 15m ${server.state.load_15.toFixed(2)}`}
          accent={loadAccent}
        />
        <Tile
          icon={<Network size={10.5} strokeWidth={2.2} />}
          label={`${t("tcp")} / ${t("udp")}`}
          value={`${server.state.tcp_conn_count} / ${server.state.udp_conn_count}`}
          tone="var(--color-c-in)"
          sub={lang === "zh-CN" ? "活跃套接字连接" : "Active sockets"}
        />
        <Tile
          icon={<Activity size={10.5} strokeWidth={2.2} />}
          label={t("process")}
          value={server.state.process_count}
          tone="var(--color-c-out)"
          sub={lang === "zh-CN" ? "运行中系统进程" : "Running tasks"}
        />
        <Tile
          icon={<Clock size={10.5} strokeWidth={2.2} />}
          label={t("uptime")}
          value={online ? formatUptime(server.state.uptime, lang) : "—"}
          tone="var(--color-up)"
          sub={
            server.host.boot_time
              ? `${t("bootTime")} ${new Date(server.host.boot_time * 1000).toLocaleDateString()}`
              : undefined
          }
        />
        {gpus.length > 0 && <GpuTile gpus={gpus} />}
      </section>

      {/* 温度传感器 */}
      {temps.length > 0 && <TemperatureStrip temps={temps} />}

      {/* 实时图表 */}
      <RealtimeCharts serverId={serverId} />

      {/* Ping 监控 */}
      <PingChart serverId={serverId} />

      {/* TSDB 历史指标(v2) */}
      {tsdbEnabled && <HistoryChart serverId={serverId} hasGpu={server.host.gpu.length > 0} />}
    </div>
  );
}
