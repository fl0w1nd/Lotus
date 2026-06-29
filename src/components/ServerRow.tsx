import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  Repeat,
} from "lucide-react";
import { memo, type ReactNode, useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import {
  billingDaysLeft,
  cn,
  diskPercent,
  expireHeatColor,
  formatBytes,
  formatExpiryParts,
  formatSpeed,
  formatUptimeParts,
  memPercent,
  parsePublicNote,
  platformName,
} from "@/lib/utils";
import type { NezhaServer, ServerCycleInfo } from "@/types/nezha";
import { Flag } from "./Flag";
import { OsIcon } from "./OsIcon";

interface ServerRowProps {
  server: NezhaServer;
  online: boolean;
  index?: number;
  animateIn?: boolean;
  /** 该服务器的周期流量(后端实测,需面板配 transfer_*_cycle 告警规则) */
  cycle?: ServerCycleInfo;
}

export const ServerRow = memo(function ServerRow({
  server,
  online,
  index = 0,
  animateIn = false,
  cycle,
}: ServerRowProps) {
  const { t, lang } = useI18n();

  const note = useMemo(() => parsePublicNote(server.public_note), [server.public_note]);
  const daysLeft = billingDaysLeft(note?.billingDataMod);
  const expiry = formatExpiryParts(daysLeft, lang);
  const uptime = formatUptimeParts(server.state.uptime, lang);

  const cyclePct = cycle && cycle.max > 0 ? Math.min((cycle.used / cycle.max) * 100, 100) : null;
  const cycleColor =
    cyclePct === null
      ? "var(--color-muted)"
      : cyclePct >= 90
        ? "var(--color-down)"
        : cyclePct >= 75
          ? "var(--color-warn)"
          : "var(--color-muted)";
  const cycleTitle = cycle
    ? `${t("cycleTransfer")} · ${cycle.cycleName} · ${formatBytes(cycle.used)} / ${formatBytes(cycle.max)} · ${t("nextReset")} ${new Date(cycle.to).toLocaleDateString()}`
    : undefined;

  const upSpeed = server.state.net_out_speed;
  const downSpeed = server.state.net_in_speed;
  const isActive = upSpeed + downSpeed > 1024;
  const netState = !online ? "offline" : isActive ? "live" : "idle";
  const netConfig = {
    live: { color: "var(--color-up)", label: t("netLive"), animate: true },
    idle: { color: "var(--color-faint)", label: t("netIdle"), animate: false },
    offline: { color: "var(--color-down)", label: t("offline"), animate: false },
  }[netState];

  return (
    <Link
      to={`/server/${server.id}`}
      className={cn(
        "card card-hover group flex flex-col gap-3 p-3.5 md:grid md:grid-cols-12 md:items-center md:gap-4 md:py-2.5",
        animateIn && "fade-up",
        !online && "saturate-50 [&_.dim-offline]:opacity-55",
      )}
      style={animateIn ? { animationDelay: `${Math.min(index, 16) * 30}ms` } : undefined}
    >
      {/* 身份:国旗 + 状态点 + 名称 + 系统 (col-span-4) */}
      <div className="flex min-w-0 items-center gap-3 md:col-span-4">
        <Flag code={server.country_code} className="shrink-0 text-base" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                online ? "bg-up animate-pulse-soft" : "bg-down",
              )}
            />
            <h3 className="min-w-0 truncate text-[13.5px] font-semibold tracking-tight text-fg transition-colors group-hover:text-accent">
              {server.name}
            </h3>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-faint">
            <OsIcon platform={server.host.platform} className="size-2.5 shrink-0 opacity-85" />
            <span className="truncate">
              {platformName(server.host.platform)}
              {server.host.arch ? ` · ${server.host.arch}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* 指标:CPU / 内存 / 磁盘 (col-span-3) */}
      <div className="dim-offline flex items-center gap-3 md:col-span-3">
        <MiniMetric
          icon={<Cpu size={11} strokeWidth={2} />}
          percent={server.state.cpu}
          tone="var(--color-c-cpu)"
        />
        <MiniMetric
          icon={<MemoryStick size={11} strokeWidth={2} />}
          percent={memPercent(server)}
          tone="var(--color-c-mem)"
        />
        <MiniMetric
          icon={<HardDrive size={11} strokeWidth={2} />}
          percent={diskPercent(server)}
          tone="var(--color-c-disk)"
        />
      </div>

      {/* 网络:速率 + 实时指示灯 (col-span-3) */}
      <div className="dim-offline flex items-center justify-between gap-2 md:col-span-3">
        <div className="tnum flex items-center gap-3 font-mono text-[11px] text-fg-2">
          <span className="inline-flex items-center gap-1">
            <ArrowUp size={11} strokeWidth={2.4} className="text-c-out" />
            {formatSpeed(upSpeed)}
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowDown size={11} strokeWidth={2.4} className="text-c-in" />
            {formatSpeed(downSpeed)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {cyclePct !== null && (
            <span
              className="tnum hidden items-center gap-1 font-mono text-[10px] font-medium xl:inline-flex"
              style={{ color: cycleColor }}
              title={cycleTitle}
            >
              <Repeat size={9} strokeWidth={2.2} />
              {cyclePct.toFixed(0)}%
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-medium"
            style={{ color: netConfig.color }}
          >
            <span
              className={cn("size-1.5 rounded-full bg-current", netConfig.animate && "live-dot")}
            />
            <span className="hidden lg:inline">{netConfig.label}</span>
          </span>
        </div>
      </div>

      {/* 在线 / 到期 (col-span-2) */}
      <div className="flex items-center justify-between gap-3 md:col-span-2 md:justify-end">
        <RowStat
          icon={<Clock size={11} strokeWidth={2} />}
          value={online ? uptime.value : "—"}
          unit={online ? uptime.unit : ""}
        />
        <RowStat
          icon={<Calendar size={11} strokeWidth={2} />}
          value={expiry.value}
          unit={expiry.unit}
          color={expireHeatColor(daysLeft)}
        />
      </div>
    </Link>
  );
});

function MiniMetric({ icon, percent, tone }: { icon: ReactNode; percent: number; tone: string }) {
  const p = Math.min(Math.max(percent, 0), 100);
  const fill = p >= 90 ? "var(--color-down)" : p >= 75 ? "var(--color-warn)" : tone;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-center justify-between gap-1">
        <span className="shrink-0" style={{ color: tone }}>
          {icon}
        </span>
        <span className="tnum font-mono text-[10px] font-medium text-fg-2">{p.toFixed(0)}%</span>
      </div>
      <div className="seg-bar" aria-hidden>
        <span style={{ width: `${p}%`, background: fill }} />
      </div>
    </div>
  );
}

function RowStat({
  icon,
  value,
  unit,
  color,
}: {
  icon: ReactNode;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="self-center text-faint">{icon}</span>
      <span
        className="tnum font-mono text-[11px] font-semibold leading-none"
        style={{ color: color ?? "var(--color-fg-2)" }}
      >
        {value}
        {unit && <span className="ml-0.5 text-[9px] font-normal text-faint">{unit}</span>}
      </span>
    </span>
  );
}
