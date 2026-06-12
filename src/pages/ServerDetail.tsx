import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { HistoryChart } from "@/components/detail/HistoryChart";
import { PingChart } from "@/components/detail/PingChart";
import { RealtimeCharts } from "@/components/detail/RealtimeCharts";
import { Flag } from "@/components/Flag";
import { OsIcon } from "@/components/OsIcon";
import { fetchSetting } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  billingDaysLeft,
  cn,
  cpuCoreCount,
  diskPercent,
  formatBytes,
  formatUptime,
  isServerOnline,
  memPercent,
  parsePublicNote,
  platformName,
} from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";

function Tile({
  label,
  value,
  sub,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 bg-surface px-4 py-3", className)}>
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
        {label}
      </span>
      <span className={cn("tnum font-mono text-[15px] font-medium leading-tight", accent)}>
        {value}
      </span>
      {sub && <span className="tnum truncate font-mono text-[10px] text-faint">{sub}</span>}
    </div>
  );
}

function tempColor(c: number): string {
  if (c >= 75) return "text-down";
  if (c >= 55) return "text-warn";
  return "text-c-in";
}

/** 温度传感器条:点 + 名称 + 数值,按温度着色 */
function TemperatureStrip({ temps }: { temps: { Name: string; Temperature: number }[] }) {
  const { t } = useI18n();
  const sorted = [...temps]
    .filter((s) => s.Temperature > 0)
    .sort((a, b) => b.Temperature - a.Temperature);
  if (!sorted.length) return null;

  return (
    <div className="card flex flex-col gap-2.5 p-4">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
        {t("temperature")}
      </span>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {sorted.map((s) => (
          <div key={s.Name} className="flex items-center gap-2" title={s.Name}>
            <span className="max-w-36 truncate font-mono text-[10.5px] text-muted">{s.Name}</span>
            <span className="h-3 w-px bg-line" />
            <span className={cn("tnum font-mono text-xs font-medium", tempColor(s.Temperature))}>
              {s.Temperature.toFixed(0)}°C
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1 break-words rounded-md border border-line bg-surface px-2 py-1 font-mono text-[10.5px] leading-relaxed text-muted"
    >
      {children}
    </span>
  );
}

export default function ServerDetail() {
  const { id } = useParams();
  const serverId = Number(id);
  const { snapshot } = useNezhaWS();
  const { t, lang } = useI18n();

  const { data: setting } = useQuery({
    queryKey: ["setting"],
    queryFn: fetchSetting,
  });
  const tsdbEnabled = setting?.data?.tsdb_enabled === true;

  const server = useMemo(
    () => snapshot?.servers?.find((s) => s.id === serverId),
    [snapshot, serverId],
  );

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
  // 负载相对核心数着色;核心数未知则保持中性
  const loadAccent =
    cores && server.state.load_1 >= cores
      ? "text-down"
      : cores && server.state.load_1 >= cores * 0.7
        ? "text-warn"
        : undefined;
  const gpuValues = server.state.gpu ?? [];
  const temps = server.state.temperatures ?? [];

  const truncateString = (str: string, maxLen = 32): string => {
    if (!str) return "";
    if (str.length <= maxLen) return str;
    return `${str.slice(0, maxLen)}…`;
  };

  return (
    <div className="flex flex-col gap-3 pt-5">
      {/* 返回 + 标题 */}
      <div className="flex flex-col gap-3">
        <Link
          to="/"
          className="flex w-fit items-center gap-1 text-xs text-faint transition-colors hover:text-fg-2"
        >
          <svg viewBox="0 0 16 16" fill="none" className="size-3">
            <path
              d="M10 3 5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t("backHome")}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Flag code={server.country_code} className="text-2xl" />
          <h1 className="text-xl font-semibold tracking-tight">{server.name}</h1>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              online ? "border-up/20 bg-up/10 text-up" : "border-down/20 bg-down/10 text-down",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                online ? "bg-up animate-pulse-soft" : "bg-down",
              )}
            />
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
                          ? "border-line bg-surface text-muted"
                          : "border-line bg-surface text-faint",
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
            <OsIcon platform={server.host.platform} className="size-3 opacity-80" />
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
          {plan?.bandwidth && <Chip>{plan.bandwidth}</Chip>}
          {plan?.trafficVol && <Chip>{plan.trafficVol}</Chip>}
          {plan?.IPv4 === "1" && <Chip>IPv4</Chip>}
          {plan?.IPv6 === "1" && <Chip>IPv6</Chip>}
          {plan?.networkRoute && <Chip>{plan.networkRoute}</Chip>}
          {plan?.extra && <Chip>{plan.extra}</Chip>}
        </div>
      </div>

      {/* 实时指标瓦片:gap-px 露出底层线色,天然形成网格,任意数量/断点都不会断线 */}
      <section
        className={cn(
          "grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4 xl:grid-cols-8",
          !online && "opacity-75 saturate-50",
        )}
      >
        <Tile label={t("cpu")} value={`${server.state.cpu.toFixed(1)}%`} />
        <Tile
          label={t("memory")}
          value={`${memPercent(server).toFixed(1)}%`}
          sub={`${formatBytes(server.state.mem_used)} / ${formatBytes(server.host.mem_total)}`}
        />
        <Tile
          label={t("swap")}
          value={
            server.host.swap_total
              ? `${((server.state.swap_used / server.host.swap_total) * 100).toFixed(1)}%`
              : "—"
          }
          sub={
            server.host.swap_total
              ? `${formatBytes(server.state.swap_used)} / ${formatBytes(server.host.swap_total)}`
              : undefined
          }
        />
        <Tile
          label={t("disk")}
          value={`${diskPercent(server).toFixed(1)}%`}
          sub={`${formatBytes(server.state.disk_used)} / ${formatBytes(server.host.disk_total)}`}
        />
        <Tile
          label={t("load")}
          value={server.state.load_1.toFixed(2)}
          sub={`${server.state.load_5.toFixed(2)} · ${server.state.load_15.toFixed(2)}`}
          accent={loadAccent}
        />
        <Tile
          label={`${t("tcp")} / ${t("udp")}`}
          value={`${server.state.tcp_conn_count} / ${server.state.udp_conn_count}`}
        />
        <Tile label={t("process")} value={server.state.process_count} />
        <Tile
          label={t("uptime")}
          value={online ? formatUptime(server.state.uptime, lang) : "—"}
          sub={
            server.host.boot_time
              ? new Date(server.host.boot_time * 1000).toLocaleDateString()
              : undefined
          }
        />
        {gpuValues.length > 0 && (
          <Tile
            label={t("gpu")}
            // 第 9 块瓦片占满整行,顺带容纳多卡
            className="col-span-2 sm:col-span-4 xl:col-span-8"
            value={
              <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {gpuValues.map((v, i) => (
                  <span key={i} className="inline-flex items-baseline gap-1.5">
                    {gpuValues.length > 1 && (
                      <span className="font-mono text-[10px] text-faint">#{i}</span>
                    )}
                    {v.toFixed(0)}%
                  </span>
                ))}
              </span>
            }
            sub={server.host.gpu?.join(" / ")}
          />
        )}
      </section>

      {/* 温度传感器 */}
      {temps.length > 0 && <TemperatureStrip temps={temps} />}

      {/* 实时图表 */}
      <RealtimeCharts serverId={serverId} />

      {/* Ping 监控 */}
      <PingChart serverId={serverId} />

      {/* TSDB 历史指标(v2) */}
      {tsdbEnabled && <HistoryChart serverId={serverId} />}
    </div>
  );
}
