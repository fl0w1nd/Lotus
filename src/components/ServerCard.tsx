import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import {
  billingDaysLeft,
  cn,
  diskPercent,
  formatBytes,
  formatSpeed,
  formatUptime,
  memPercent,
  parsePublicNote,
  platformName,
} from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";
import type { NezhaServer } from "@/types/nezha";
import { Flag } from "./Flag";
import { OsIcon } from "./OsIcon";
import { Sparkline } from "./Sparkline";
import { UsageBar } from "./UsageBar";

interface ServerCardProps {
  server: NezhaServer;
  online: boolean;
  index?: number;
  /** 仅首屏播放入场动画,过滤/排序时不重放 */
  animateIn?: boolean;
}

function parseTrafficLimit(volStr?: string): number | null {
  if (!volStr) return null;
  const match = volStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]B|[KMGT])/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit.startsWith("T")) return val * 1024 * 1024 * 1024 * 1024;
  if (unit.startsWith("G")) return val * 1024 * 1024 * 1024;
  if (unit.startsWith("M")) return val * 1024 * 1024;
  if (unit.startsWith("K")) return val * 1024;
  return val;
}

export const ServerCard = memo(function ServerCard({
  server,
  online,
  index = 0,
  animateIn = false,
}: ServerCardProps) {
  const { t, lang } = useI18n();
  const { historyOf } = useNezhaWS();
  const showTransfer = window.ShowNetTransfer !== false;

  const history = historyOf(server.id);
  const downSeries = history.map((h) => h.down);

  const note = useMemo(() => parsePublicNote(server.public_note), [server.public_note]);
  const billing = note?.billingDataMod;
  const plan = note?.planDataMod;

  const currentTransfer = useMemo(() => {
    if (
      plan?.trafficType === "3" ||
      plan?.trafficType === "double" ||
      plan?.trafficType === "both"
    ) {
      return server.state.net_out_transfer + server.state.net_in_transfer;
    }
    return server.state.net_out_transfer;
  }, [server.state, plan]);

  const trafficLimitBytes = useMemo(() => parseTrafficLimit(plan?.trafficVol), [plan?.trafficVol]);

  const trafficPercent = useMemo(() => {
    if (!trafficLimitBytes || trafficLimitBytes <= 0) return 0;
    return (currentTransfer / trafficLimitBytes) * 100;
  }, [currentTransfer, trafficLimitBytes]);
  const daysLeft = billingDaysLeft(billing);
  const billingTitle =
    billing?.amount && billing.amount !== "0"
      ? `${billing.amount}${billing.cycle ? `/${billing.cycle}` : ""}`
      : billing?.amount === "0"
        ? t("free")
        : "";

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

  return (
    <Link
      to={`/server/${server.id}`}
      className={cn(
        "card card-hover group flex flex-col gap-3.5 p-4",
        animateIn && "fade-up",
        // 离线:整体降饱和但保留标题对比度,仅内容区淡化
        !online && "saturate-50 [&_.dim-offline]:opacity-55",
      )}
      style={animateIn ? { animationDelay: `${Math.min(index, 16) * 30}ms` } : undefined}
    >
      {/* 标题行 */}
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
          {online ? formatUptime(server.state.uptime, lang) : t("offline")}
        </span>
      </div>

      {/* 平台信息 */}
      <p className="-mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-faint">
        <OsIcon platform={server.host.platform} className="size-3 shrink-0 opacity-80" />
        <span className="min-w-0 flex-1 truncate">
          {platformName(server.host.platform)}
          {server.host.platform_version ? ` ${server.host.platform_version}` : ""}
          {server.host.arch ? ` · ${server.host.arch}` : ""}
        </span>
      </p>

      {/* 套餐标签 & 账单徽章 */}
      {(planTags.length > 0 || daysLeft !== null) && (
        <div className="-mt-1.5 flex flex-wrap gap-1">
          {daysLeft !== null && (
            <span
              title={billingTitle || undefined}
              className={cn(
                "rounded border px-1.5 py-px font-mono text-[10px] leading-relaxed font-semibold shrink-0",
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
              {billingTitle ? `${billingTitle} · ` : ""}
              {daysLeft < 0 ? t("expired") : `${daysLeft}${lang === "zh-CN" ? "天" : "d"}`}
            </span>
          )}
          {planTags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-line px-1.5 py-px font-mono text-[10px] leading-relaxed text-faint"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 资源占用 */}
      <div className="dim-offline flex flex-col gap-2.5">
        <UsageBar label={t("cpu")} percent={server.state.cpu} />
        <UsageBar
          label={t("memory")}
          percent={memPercent(server)}
          detail={`${formatBytes(server.state.mem_used)} / ${formatBytes(server.host.mem_total)}`}
        />
        <UsageBar
          label={t("disk")}
          percent={diskPercent(server)}
          detail={`${formatBytes(server.state.disk_used)} / ${formatBytes(server.host.disk_total)}`}
        />
      </div>

      {/* 网络 */}
      <div className="dim-offline flex flex-col gap-2 border-t border-line pt-3">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="tnum flex items-baseline gap-3 font-mono text-[11.5px] text-fg-2">
              <span className="inline-flex items-baseline gap-1">
                <span className="text-[10px] text-c-out">↑</span>
                {formatSpeed(server.state.net_out_speed)}
              </span>
              <span className="inline-flex items-baseline gap-1">
                <span className="text-[10px] text-c-in">↓</span>
                {formatSpeed(server.state.net_in_speed)}
              </span>
            </div>
            {showTransfer && trafficLimitBytes === null && (
              <div className="tnum flex items-baseline gap-3 font-mono text-[10px] text-faint">
                <span>{formatBytes(server.state.net_out_transfer)}</span>
                <span>{formatBytes(server.state.net_in_transfer)}</span>
              </div>
            )}
          </div>
          <div className="text-c-in opacity-70 transition-opacity group-hover:opacity-100">
            <Sparkline values={downSeries} width={88} height={26} />
          </div>
        </div>

        {/* 流量限额进度条 */}
        {showTransfer && trafficLimitBytes !== null && trafficLimitBytes > 0 && (
          <div className="w-full">
            <div className="mb-0.5 flex justify-between text-[9px] font-mono text-faint leading-none">
              <span>
                {plan?.trafficType === "3" ||
                plan?.trafficType === "double" ||
                plan?.trafficType === "both"
                  ? lang === "zh-CN"
                    ? "双向流量"
                    : "Dual Traffic"
                  : lang === "zh-CN"
                    ? "出站流量"
                    : "Outbound Traffic"}
              </span>
              <span>
                {formatBytes(currentTransfer)} / {plan?.trafficVol} (
                {Math.min(trafficPercent, 100).toFixed(0)}%)
              </span>
            </div>
            <div className="h-[2px] w-full overflow-hidden rounded-full bg-line">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  trafficPercent >= 90 ? "bg-down" : trafficPercent >= 75 ? "bg-warn" : "bg-c-in",
                )}
                style={{ width: `${Math.min(trafficPercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
});
