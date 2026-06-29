import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Clock,
  Cpu,
  Gauge,
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
  cpuCoreCount,
  diskPercent,
  expireHeatColor,
  formatBytes,
  formatExpiryParts,
  formatOfflineDuration,
  formatSpeed,
  formatUptimeParts,
  memPercent,
  parsePublicNote,
  platformName,
} from "@/lib/utils";
import type { NezhaServer, ServerCycleInfo } from "@/types/nezha";
import { Flag } from "./Flag";
import { OsIcon } from "./OsIcon";
import { UsageBar } from "./UsageBar";

interface ServerCardProps {
  server: NezhaServer;
  online: boolean;
  index?: number;
  /** 仅首屏播放入场动画,过滤/排序时不重放 */
  animateIn?: boolean;
  /** 列表中存在带套餐标签的卡片时,统一预留标签行高度以对齐 */
  reserveTags?: boolean;
  /** 列表中存在累计流量时,统一预留流量行高度以对齐 */
  reserveTraffic?: boolean;
  /** 该服务器的周期流量(后端实测,需面板配 transfer_*_cycle 告警规则) */
  cycle?: ServerCycleInfo;
  /** 列表中存在周期流量时,统一预留周期流量行高度以对齐 */
  reserveCycle?: boolean;
}

export const ServerCard = memo(function ServerCard({
  server,
  online,
  index = 0,
  animateIn = false,
  reserveTags = false,
  reserveTraffic = false,
  cycle,
  reserveCycle = false,
}: ServerCardProps) {
  const { t, lang } = useI18n();
  const showTransfer = window.ShowNetTransfer !== false;

  const note = useMemo(() => parsePublicNote(server.public_note), [server.public_note]);
  const billing = note?.billingDataMod;
  const plan = note?.planDataMod;

  const cyclePct = cycle && cycle.max > 0 ? Math.min((cycle.used / cycle.max) * 100, 100) : 0;
  const cycleRange = cycle ? `${shortDate(cycle.from)} → ${shortDate(cycle.to)}` : undefined;
  const cycleTitle = cycle
    ? `${cycle.cycleName} · ${formatBytes(cycle.used)} / ${formatBytes(cycle.max)} · ${t("nextReset")} ${new Date(cycle.to).toLocaleDateString()}`
    : undefined;

  const daysLeft = billingDaysLeft(billing);
  const billingTitle =
    billing?.amount && billing.amount !== "0"
      ? `${billing.amount}${billing.cycle ? `/${billing.cycle}` : ""}`
      : billing?.amount === "0"
        ? t("free")
        : undefined;

  const planTags = [
    plan?.networkRoute,
    plan?.bandwidth,
    plan?.trafficVol,
    plan?.IPv4 === "1" && plan?.IPv6 === "1"
      ? t("dualStack")
      : plan?.IPv4 === "1"
        ? "IPv4"
        : plan?.IPv6 === "1"
          ? "IPv6"
          : null,
    plan?.extra,
  ].filter((v): v is string => Boolean(v));

  const cores = cpuCoreCount(server.host.cpu) ?? 4;
  const load1 = server.state.load_1 ?? 0;
  const loadPercent = Math.min((load1 / cores) * 100, 100);

  const upSpeed = server.state.net_out_speed;
  const downSpeed = server.state.net_in_speed;
  // > 1KB/s 视为"活跃"
  const isActive = upSpeed + downSpeed > 1024;
  const netState = !online ? "offline" : isActive ? "live" : "idle";
  const netConfig = {
    live: { color: "var(--color-up)", label: t("netLive"), animate: true },
    idle: { color: "var(--color-faint)", label: t("netIdle"), animate: false },
    offline: { color: "var(--color-down)", label: t("offline"), animate: false },
  }[netState];

  const uptime = formatUptimeParts(server.state.uptime, lang);
  const expiry = formatExpiryParts(daysLeft, lang);
  const offline = online ? null : formatOfflineDuration(server.last_active, lang);

  return (
    <Link
      to={`/server/${server.id}`}
      className={cn(
        "card card-hover group flex flex-col gap-3.5 p-4",
        animateIn && "fade-up",
        // 离线:整体降饱和,内容区淡化但标题保留对比度
        !online && "saturate-50 [&_.dim-offline]:opacity-55",
      )}
      style={animateIn ? { animationDelay: `${Math.min(index, 16) * 30}ms` } : undefined}
    >
      {/* 身份块:标题 + 平台 + 套餐标签 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Flag code={server.country_code} className="text-base" />
          <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-tight">
            {server.name}
          </h3>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              online ? "border-up/20 bg-up/10 text-up" : "border-down/20 bg-down/10 text-down",
            )}
          >
            <span
              className={cn("size-1 rounded-full", online ? "bg-up animate-pulse-soft" : "bg-down")}
            />
            {online
              ? t("online")
              : offline
                ? `${t("offline")} · ${offline.value}${offline.unit}`
                : t("offline")}
          </span>
        </div>

        <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-faint">
          <OsIcon platform={server.host.platform} className="size-3 shrink-0 opacity-80" />
          <span className="min-w-0 flex-1 truncate">
            {platformName(server.host.platform)}
            {server.host.platform_version ? ` ${server.host.platform_version}` : ""}
            {server.host.arch ? ` · ${server.host.arch}` : ""}
          </span>
        </p>

        {(reserveTags || planTags.length > 0) && (
          <div className="flex h-[22px] items-center gap-1 overflow-hidden">
            {planTags.map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded border border-line px-1.5 py-px font-mono text-[10px] leading-relaxed text-faint"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 资源占用 */}
      <div className="dim-offline flex flex-col gap-2.5">
        <UsageBar
          icon={<Cpu size={13} strokeWidth={2} />}
          label={t("cpu")}
          percent={server.state.cpu}
          detail={`${cores} ${lang === "zh-CN" ? "核" : "C"}`}
          tone="var(--color-c-cpu)"
        />
        <UsageBar
          icon={<MemoryStick size={13} strokeWidth={2} />}
          label={t("memory")}
          percent={memPercent(server)}
          detail={`${formatBytes(server.state.mem_used)} / ${formatBytes(server.host.mem_total)}`}
          tone="var(--color-c-mem)"
        />
        <UsageBar
          icon={<HardDrive size={13} strokeWidth={2} />}
          label={t("disk")}
          percent={diskPercent(server)}
          detail={`${formatBytes(server.state.disk_used)} / ${formatBytes(server.host.disk_total)}`}
          tone="var(--color-c-disk)"
        />
        <UsageBar
          icon={<Gauge size={13} strokeWidth={2} />}
          label={t("load")}
          percent={loadPercent}
          valueText={load1.toFixed(2)}
          unit=""
          detail={`/ ${cores} ${lang === "zh-CN" ? "核" : "C"}`}
          tone="var(--color-accent)"
        />
      </div>

      {/* 网络:速率 + 实时指示灯 */}
      <div className="dim-offline flex flex-col gap-2 border-t border-line pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="tnum flex items-center gap-3 font-mono text-[12px] text-fg-2">
            <span className="inline-flex items-center gap-1">
              <ArrowUp size={12} strokeWidth={2.4} className="text-c-out" />
              {formatSpeed(upSpeed)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDown size={12} strokeWidth={2.4} className="text-c-in" />
              {formatSpeed(downSpeed)}
            </span>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-medium"
            style={{ color: netConfig.color }}
          >
            <span
              className={cn("size-1.5 rounded-full bg-current", netConfig.animate && "live-dot")}
            />
            {netConfig.label}
          </span>
        </div>

        {/* 开机以来累计流量(WS 实时,agent 重启清零;与周期流量区分) */}
        {reserveTraffic && (
          <div className="flex min-h-[16px] items-center justify-between gap-2">
            <span className="text-[9px] font-medium uppercase tracking-[0.04em] text-faint">
              {t("traffic")}
            </span>
            {showTransfer && (
              <div className="tnum flex items-center gap-3 font-mono text-[10px] text-faint">
                <span className="inline-flex items-center gap-1">
                  <ArrowUp size={9} strokeWidth={2.4} />
                  {formatBytes(server.state.net_out_transfer)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ArrowDown size={9} strokeWidth={2.4} />
                  {formatBytes(server.state.net_in_transfer)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 周期流量(后端按计费周期实测,重启不清零) */}
        {reserveCycle && (
          <div className="flex min-h-[34px] flex-col justify-center">
            {cycle && cycle.max > 0 ? (
              <div className="w-full" title={cycleTitle}>
                <div className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[9px] leading-none">
                  <span className="inline-flex shrink-0 items-center gap-1 text-faint">
                    <Repeat size={9} strokeWidth={2.2} />
                    {t("cycleTransfer")}
                  </span>
                  <span className="tnum truncate text-right text-fg-2">
                    {formatBytes(cycle.used)}
                    <span className="text-faint"> / {formatBytes(cycle.max)}</span> (
                    {cyclePct.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-line">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      cyclePct >= 90 ? "bg-down" : cyclePct >= 75 ? "bg-warn" : "bg-c-cpu",
                    )}
                    style={{ width: `${cyclePct}%` }}
                  />
                </div>
                <div className="tnum mt-1 text-right font-mono text-[8.5px] leading-none text-faint">
                  {cycleRange}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 页脚:到期 / 在线 */}
      <div className="grid grid-cols-2 divide-x divide-line border-t border-line pt-3">
        <FooterStat
          icon={<Calendar size={12} strokeWidth={2} />}
          label={t("expiry")}
          value={expiry.value}
          unit={expiry.unit}
          color={expireHeatColor(daysLeft)}
          title={billingTitle}
          className="pr-3"
        />
        <FooterStat
          icon={<Clock size={12} strokeWidth={2} />}
          label={t("uptime")}
          value={online ? uptime.value : "—"}
          unit={online ? uptime.unit : ""}
          className="pl-3"
        />
      </div>
    </Link>
  );
});

/** 紧凑日期(月/日),用于卡片上标注周期流量的统计区间 */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}

function FooterStat({
  icon,
  label,
  value,
  unit,
  color,
  title,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  color?: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)} title={title}>
      <span className="flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-[0.06em] text-faint">
        {icon}
        {label}
      </span>
      <span
        className="tnum font-mono text-[13px] font-semibold leading-none"
        style={{ color: color ?? "var(--color-fg)" }}
      >
        {value}
        {unit && <span className="ml-0.5 text-[10px] font-normal text-faint">{unit}</span>}
      </span>
    </div>
  );
}
