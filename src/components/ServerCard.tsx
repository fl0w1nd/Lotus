import { memo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import {
  cn,
  diskPercent,
  formatBytes,
  formatSpeed,
  formatUptime,
  memPercent,
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
      <p className="-mt-2 flex items-center gap-1.5 truncate font-mono text-[10.5px] text-faint">
        <OsIcon platform={server.host.platform} className="size-3 opacity-80" />
        <span className="truncate">
          {platformName(server.host.platform)}
          {server.host.platform_version ? ` ${server.host.platform_version}` : ""}
          {server.host.arch ? ` · ${server.host.arch}` : ""}
        </span>
      </p>

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
      <div className="dim-offline flex items-end justify-between gap-3 border-t border-line pt-3">
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
          {showTransfer && (
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
    </Link>
  );
});
