import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import {
  billingDaysLeft,
  cn,
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

interface ServerRowProps {
  server: NezhaServer;
  online: boolean;
  index?: number;
  animateIn?: boolean;
}

export const ServerRow = memo(function ServerRow({
  server,
  online,
  index = 0,
  animateIn = false,
}: ServerRowProps) {
  const { t, lang } = useI18n();
  const { historyOf } = useNezhaWS();
  const showTransfer = window.ShowNetTransfer !== false;

  const history = historyOf(server.id);
  const downSeries = history.map((h) => h.down);

  const note = useMemo(() => parsePublicNote(server.public_note), [server.public_note]);
  const billing = note?.billingDataMod;
  const plan = note?.planDataMod;

  const daysLeft = billingDaysLeft(billing);

  const planTags = [
    plan?.networkRoute,
    plan?.bandwidth,
    daysLeft !== null
      ? daysLeft < 0
        ? t("expired")
        : `${daysLeft}${lang === "zh-CN" ? "天" : "d"}`
      : null,
  ].filter((v): v is string => Boolean(v));

  return (
    <Link
      to={`/server/${server.id}`}
      className={cn(
        "card card-hover flex flex-col gap-3 p-3.5 md:grid md:grid-cols-12 md:gap-4 md:items-center md:py-2.5",
        animateIn && "fade-up",
        !online && "saturate-50 [&_.dim-offline]:opacity-55",
      )}
      style={animateIn ? { animationDelay: `${Math.min(index, 16) * 30}ms` } : undefined}
    >
      {/* 列 1: 基本信息 (国旗 + 在线状态 + 名称 + 系统) (占 4 列) */}
      <div className="flex items-center gap-3 md:col-span-4 min-w-0">
        <Flag code={server.country_code} className="text-base shrink-0" />
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                online ? "bg-up animate-pulse-soft" : "bg-down",
              )}
            />
            <h3 className="min-w-0 truncate text-[13.5px] font-semibold tracking-tight text-fg group-hover:text-accent transition-colors">
              {server.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-faint mt-0.5">
            <OsIcon platform={server.host.platform} className="size-2.5 shrink-0 opacity-85" />
            <span className="truncate">
              {platformName(server.host.platform)} · {server.host.arch}
            </span>
          </div>
        </div>
      </div>

      {/* 列 2: Uptime / 离线时长 (占 1 列) */}
      <div className="hidden md:flex md:col-span-1 text-xs font-mono text-fg-2 truncate min-w-0">
        {online ? (
          formatUptime(server.state.uptime, lang)
        ) : (
          <span className="text-down">{t("offline")}</span>
        )}
      </div>

      {/* 列 3: 指标百分比 (CPU + MEM) (占 3 列) */}
      <div className="dim-offline flex items-center gap-4 md:col-span-3 min-w-0">
        {/* CPU */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex items-center justify-between text-[9px] font-mono text-faint">
            <span>CPU</span>
            <span className="text-fg-2 font-medium">{server.state.cpu.toFixed(0)}%</span>
          </div>
          <div className="h-1 w-full bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-c-cpu rounded-full transition-all duration-500"
              style={{ width: `${Math.min(server.state.cpu, 100)}%` }}
            />
          </div>
        </div>

        {/* MEM */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex items-center justify-between text-[9px] font-mono text-faint">
            <span>MEM</span>
            <span className="text-fg-2 font-medium">{memPercent(server).toFixed(0)}%</span>
          </div>
          <div className="h-1 w-full bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-c-mem rounded-full transition-all duration-500"
              style={{ width: `${Math.min(memPercent(server), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 列 4: 网速/流量与套餐标签 (占 3 列) */}
      <div className="dim-offline flex items-center justify-between gap-2 md:col-span-3 min-w-0">
        <div className="flex flex-col">
          <div className="tnum flex items-baseline gap-2.5 font-mono text-[11px] text-fg-2">
            <span className="inline-flex items-baseline gap-0.5">
              <span className="text-[9px] text-c-out">↑</span>
              {formatSpeed(server.state.net_out_speed)}
            </span>
            <span className="inline-flex items-baseline gap-0.5">
              <span className="text-[9px] text-c-in">↓</span>
              {formatSpeed(server.state.net_in_speed)}
            </span>
          </div>

          {showTransfer && (
            <span className="text-[9.5px] font-mono text-faint mt-0.5 leading-none">
              {lang === "zh-CN" ? "总出: " : "Out: "}
              {formatBytes(server.state.net_out_transfer)}
            </span>
          )}
        </div>

        {/* 极简套餐/到期 Tag */}
        {planTags.length > 0 && (
          <div className="hidden lg:flex flex-wrap justify-end gap-0.5 max-w-[80px] shrink-0">
            {planTags.slice(0, 2).map((tag, i) => (
              <span
                key={tag}
                className={cn(
                  "rounded border px-1.5 py-px font-mono text-[8.5px] leading-none scale-95 origin-right",
                  i === 0 && daysLeft !== null
                    ? daysLeft < 0
                      ? "border-down/25 bg-down/15 text-down animate-pulse-urgent"
                      : daysLeft <= 3
                        ? "border-down/20 bg-down/10 text-down animate-pulse-urgent"
                        : daysLeft <= 7
                          ? "border-warn/25 bg-warn/12 text-warn animate-pulse-soft"
                          : daysLeft <= 14
                            ? "border-warn/15 bg-warn/8 text-warn"
                            : daysLeft <= 30
                              ? "border-line bg-surface-2 text-muted"
                              : "border-line bg-surface-2 text-faint"
                    : "border-line bg-surface-2 text-faint",
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 列 5: Sparkline 网络图 (占 1 列，居中偏右展示，视觉更均衡有呼吸感) */}
      <div className="dim-offline hidden md:flex md:col-span-1 justify-center items-center text-c-in opacity-70 group-hover:opacity-100 transition-opacity pr-1.5">
        <Sparkline values={downSeries} width={76} height={20} />
      </div>
    </Link>
  );
});
