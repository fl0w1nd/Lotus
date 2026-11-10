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
import { memo, useEffect, useMemo, useRef, useState } from "react";
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
import { UsageBar, usageFill } from "./UsageBar";

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
}

/** 到期天数只在临近(≤30 天)时上色,其余保持正文色 */
const EXPIRY_ALERT_DAYS = 30;

export const ServerCard = memo(function ServerCard({
  server,
  online,
  index = 0,
  animateIn = false,
  reserveTags = false,
  reserveTraffic = false,
  cycle,
}: ServerCardProps) {
  const { t, lang } = useI18n();
  const zh = lang.startsWith("zh");
  const showTransfer = window.ShowNetTransfer !== false;

  const note = useMemo(() => parsePublicNote(server.public_note), [server.public_note]);
  const billing = note?.billingDataMod;
  const plan = note?.planDataMod;

  const hasCycle = Boolean(cycle && cycle.max > 0);
  const cyclePct = cycle && hasCycle ? Math.min((cycle.used / cycle.max) * 100, 100) : 0;
  const totalText = `${t("traffic")} ↑ ${formatBytes(server.state.net_out_transfer)} ↓ ${formatBytes(server.state.net_in_transfer)}`;
  const cycleTitle =
    cycle && hasCycle
      ? [
          `${t("cycleTransfer")} · ${cycle.cycleName}`,
          `${formatBytes(cycle.used)} / ${formatBytes(cycle.max)}`,
          `${shortDate(cycle.from)} → ${shortDate(cycle.to)}`,
          `${t("nextReset")} ${new Date(cycle.to).toLocaleDateString()}`,
          ...(showTransfer ? [totalText] : []),
        ].join("\n")
      : undefined;

  const daysLeft = billingDaysLeft(billing);
  const price =
    billing?.amount && billing.amount !== "0"
      ? `${billing.amount}${billing.cycle ? `/${billing.cycle}` : ""}`
      : billing?.amount === "0"
        ? t("free")
        : undefined;

  const planTags = useMemo(() => {
    const items: { label: string; kind: "route" | "spec" }[] = [];
    if (plan?.networkRoute) items.push({ label: plan.networkRoute, kind: "route" });
    if (plan?.bandwidth) items.push({ label: plan.bandwidth, kind: "spec" });
    if (plan?.trafficVol) items.push({ label: plan.trafficVol, kind: "spec" });
    const stack =
      plan?.IPv4 === "1" && plan?.IPv6 === "1"
        ? t("dualStack")
        : plan?.IPv4 === "1"
          ? "IPv4"
          : plan?.IPv6 === "1"
            ? "IPv6"
            : null;
    if (stack) items.push({ label: stack, kind: "spec" });
    if (plan?.extra) items.push({ label: plan.extra, kind: "spec" });
    return items;
  }, [plan, t]);

  // 套餐标签行是否溢出(随卡片宽度与标签内容变化)
  const tagsRef = useRef<HTMLDivElement>(null);
  const [tagsOverflow, setTagsOverflow] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: 标签内容变化时容器尺寸不变,ResizeObserver 不会触发,需要随 planTags 重新测量
  useEffect(() => {
    const el = tagsRef.current;
    if (!el) return;
    const check = () => setTagsOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [planTags]);

  // 核数未知时按 4 核估算进度条,但不把猜的核数显示出来
  const knownCores = cpuCoreCount(server.host.cpu);
  const cores = knownCores ?? 4;
  const coreUnit = zh ? "核" : "C";
  const load1 = server.state.load_1 ?? 0;
  const loadPercent = Math.min((load1 / cores) * 100, 100);

  const upSpeed = server.state.net_out_speed;
  const downSpeed = server.state.net_in_speed;
  // > 1KB/s 视为"活跃";活跃是常态不提示,只标出空闲
  const idle = online && upSpeed + downSpeed <= 1024;

  const uptime = formatUptimeParts(server.state.uptime, lang);
  const expiry = formatExpiryParts(daysLeft, lang);
  const expiryColor =
    daysLeft != null && daysLeft <= EXPIRY_ALERT_DAYS ? expireHeatColor(daysLeft) : undefined;
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
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Flag code={server.country_code} className="text-[15px]" />
          <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-tight text-fg transition-colors group-hover:text-accent">
            {server.name}
          </h3>
          {/* 在线是常态:只留圆点;离线才用文字说明 */}
          {online ? (
            <span
              role="img"
              aria-label={t("online")}
              title={t("online")}
              className="size-1.5 shrink-0 rounded-full bg-up"
            />
          ) : (
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-down">
              <span className="size-1.5 rounded-full bg-down" />
              {offline ? `${t("offline")} · ${offline.value}${offline.unit}` : t("offline")}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-faint">
          <OsIcon platform={server.host.platform} className="size-3 shrink-0 opacity-85" />
          <span className="tnum min-w-0 flex-1 truncate">
            {platformName(server.host.platform)}
            {server.host.platform_version ? ` ${server.host.platform_version}` : ""}
            {server.host.arch ? ` · ${server.host.arch}` : ""}
            {server.host.virtualization ? ` · ${server.host.virtualization}` : ""}
          </span>
        </p>

        {(reserveTags || planTags.length > 0) && (
          // 悬停可看全部标签;只有真的放不下时才在右缘渐隐
          <div
            ref={tagsRef}
            title={planTags.length > 0 ? planTags.map((tag) => tag.label).join(" · ") : undefined}
            className={cn(
              "mt-1 flex h-[18px] items-center gap-1 overflow-hidden",
              tagsOverflow &&
                "[mask-image:linear-gradient(to_right,#000_calc(100%-20px),transparent)]",
            )}
          >
            {planTags.map((tag) => (
              <span
                key={tag.label}
                className={cn(
                  "tnum shrink-0 rounded px-1.5 py-1 text-[10px] font-medium leading-none",
                  tag.kind === "route" ? "bg-accent/10 text-accent" : "bg-surface-2 text-muted",
                )}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 资源占用:正常态统一中性色,75%/90% 才变告警/危险色 */}
      <div className="dim-offline flex flex-col gap-2.5">
        <UsageBar
          inline
          icon={<Cpu size={13} strokeWidth={2} />}
          label={t("cpu")}
          percent={server.state.cpu}
          detail={knownCores ? `${knownCores} ${coreUnit}` : undefined}
        />
        <UsageBar
          inline
          icon={<MemoryStick size={13} strokeWidth={2} />}
          label={t("memory")}
          percent={memPercent(server)}
          detail={`${formatBytes(server.state.mem_used)} / ${formatBytes(server.host.mem_total)}`}
        />
        <UsageBar
          inline
          icon={<HardDrive size={13} strokeWidth={2} />}
          label={t("disk")}
          percent={diskPercent(server)}
          detail={`${formatBytes(server.state.disk_used)} / ${formatBytes(server.host.disk_total)}`}
        />
        <UsageBar
          inline
          icon={<Gauge size={13} strokeWidth={2} />}
          label={t("load")}
          percent={loadPercent}
          valueText={load1.toFixed(2)}
          unit={knownCores ? `/${knownCores}` : ""}
          detail={knownCores ? `${load1.toFixed(2)} / ${knownCores} ${coreUnit}` : undefined}
        />
      </div>

      {/* 网络:速率 + 一行流量(有周期配额显示周期用量,否则显示开机累计) */}
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
          {idle && (
            <span className="shrink-0 text-[10px] font-medium text-faint">{t("netIdle")}</span>
          )}
        </div>

        {(reserveTraffic || hasCycle) && (
          <div className="flex h-[22px] flex-col gap-1.5">
            {cycle && hasCycle ? (
              <>
                {/* 周期流量(后端按计费周期实测,重启不清零);区间与累计流量见悬停提示 */}
                <div
                  className="flex items-center justify-between gap-2 text-[10px] leading-none"
                  title={cycleTitle}
                >
                  <span className="label-caps inline-flex shrink-0 items-center gap-1 font-medium text-faint">
                    <Repeat size={10} strokeWidth={2.2} />
                    {t("cycleTransfer")}
                  </span>
                  <span className="tnum truncate text-right font-mono text-fg-2">
                    {formatBytes(cycle.used)}
                    <span className="text-faint"> / {formatBytes(cycle.max)}</span>
                    <span className="ml-1.5 font-semibold">{cyclePct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${cyclePct}%`, background: usageFill(cyclePct) }}
                  />
                </div>
              </>
            ) : (
              showTransfer && (
                // 开机以来累计流量(WS 实时,agent 重启清零)
                <div className="flex items-center justify-between gap-2 text-[10px] leading-none">
                  <span className="label-caps font-medium text-faint">{t("traffic")}</span>
                  <div className="tnum flex items-center gap-3 font-mono text-muted">
                    <span className="inline-flex items-center gap-1">
                      <ArrowUp size={10} strokeWidth={2.4} />
                      {formatBytes(server.state.net_out_transfer)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ArrowDown size={10} strokeWidth={2.4} />
                      {formatBytes(server.state.net_in_transfer)}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* 页脚:到期(附价格) / 在线时长,一行;mt-auto 让各卡片页脚贴底对齐 */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-[11px] leading-none">
        <span className="flex min-w-0 items-center gap-1.5 text-faint">
          <Calendar size={12} strokeWidth={2} className="shrink-0" />
          <span className="shrink-0">{t("expiry")}</span>
          <span
            className="tnum shrink-0 font-mono text-[12px] font-semibold"
            style={{ color: expiryColor ?? "var(--color-fg)" }}
          >
            {expiry.value}
            {expiry.unit && <span className="ml-0.5 text-[10px] font-normal">{expiry.unit}</span>}
          </span>
          {price && <span className="tnum min-w-0 truncate">· {price}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-faint">
          <Clock size={12} strokeWidth={2} className="shrink-0" />
          <span>{t("uptime")}</span>
          <span className="tnum font-mono text-[12px] font-semibold text-fg">
            {online ? uptime.value : "—"}
            {online && uptime.unit && (
              <span className="ml-0.5 text-[10px] font-normal text-faint">{uptime.unit}</span>
            )}
          </span>
        </span>
      </div>
    </Link>
  );
});

/** 紧凑日期(月/日),用于标注周期流量的统计区间 */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}
