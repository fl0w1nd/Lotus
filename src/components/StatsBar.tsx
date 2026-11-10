import NumberFlow from "@number-flow/react";
import { Activity, ArrowDown, ArrowUp, Globe, HardDriveDownload, Server } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { cn, formatBytes, formatSpeed, isServerOnline } from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";
import { Flag } from "./Flag";
import { SegmentedBar } from "./UsageBar";

function StatCell({
  icon,
  tone,
  label,
  badge,
  children,
  footer,
}: {
  icon: ReactNode;
  tone: string;
  label: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-2.5 px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <span
            className="flex size-4.5 shrink-0 items-center justify-center rounded-[5px]"
            style={{
              color: tone,
              background: `color-mix(in oklab, ${tone} 13%, transparent)`,
            }}
          >
            {icon}
          </span>
          {label}
        </span>
        {badge}
      </div>
      <div className="tnum font-mono text-lg font-semibold leading-none tracking-tight sm:text-xl">
        {children}
      </div>
      {footer && <div className="pt-0.5">{footer}</div>}
    </div>
  );
}

export function StatsBar() {
  const { snapshot } = useNezhaWS();
  const { t } = useI18n();

  const stats = useMemo(() => {
    const servers = snapshot?.servers ?? [];
    const now = snapshot?.now ?? Date.now();
    const online = servers.filter((s) => isServerOnline(now, s));
    const regionCounts = new Map<string, number>();
    for (const s of servers) {
      const cc = (s.country_code || "").toLowerCase();
      if (cc) regionCounts.set(cc, (regionCounts.get(cc) ?? 0) + 1);
    }
    const topRegions = [...regionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cc]) => cc);

    let up = 0;
    let down = 0;
    let tin = 0;
    let tout = 0;
    for (const s of online) {
      up += s.state.net_out_speed;
      down += s.state.net_in_speed;
      tin += s.state.net_in_transfer;
      tout += s.state.net_out_transfer;
    }
    const onlinePct = servers.length > 0 ? (online.length / servers.length) * 100 : 100;
    return {
      total: servers.length,
      online: online.length,
      offline: servers.length - online.length,
      onlinePct,
      regions: regionCounts.size,
      topRegions,
      up,
      down,
      tin,
      tout,
    };
  }, [snapshot]);

  const healthColor =
    stats.online === stats.total
      ? "var(--color-up)"
      : stats.online >= stats.total / 2
        ? "var(--color-warn)"
        : "var(--color-down)";

  return (
    <section className="card grid grid-cols-2 divide-x divide-line md:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line md:[&>*:nth-child(n+3)]:border-t-0">
      <StatCell
        icon={<Server size={12} strokeWidth={2.2} />}
        tone={healthColor}
        label={t("online")}
        badge={
          <span
            className={cn(
              "tnum rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none",
              stats.offline === 0
                ? "border-up/25 bg-up/10 text-up"
                : "border-warn/25 bg-warn/10 text-warn",
            )}
          >
            {stats.onlinePct.toFixed(0)}%
          </span>
        }
        footer={
          <SegmentedBar percent={stats.onlinePct} fill={healthColor} segments={18} size="sm" />
        }
      >
        <span className="inline-flex items-baseline gap-1.5">
          <span style={{ color: healthColor }}>
            <NumberFlow value={stats.online} />
          </span>
          <span className="text-sm font-normal text-faint">/ {stats.total}</span>
        </span>
      </StatCell>

      <StatCell
        icon={<Globe size={12} strokeWidth={2.2} />}
        tone="var(--color-accent)"
        label={t("regionsLabel")}
        footer={
          stats.topRegions.length > 0 ? (
            <div className="flex items-center -space-x-1 overflow-hidden py-0.5">
              {stats.topRegions.map((cc) => (
                <Flag
                  key={cc}
                  code={cc}
                  className="text-[13px] ring-2 ring-surface dark:ring-surface"
                />
              ))}
              {stats.regions > stats.topRegions.length && (
                <span className="pl-2 font-mono text-[10px] text-faint">
                  +{stats.regions - stats.topRegions.length}
                </span>
              )}
            </div>
          ) : null
        }
      >
        <NumberFlow value={stats.regions} />
      </StatCell>

      <StatCell
        icon={<Activity size={12} strokeWidth={2.2} />}
        tone="var(--color-c-in)"
        label={t("netSpeed")}
        badge={
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-up">
            <span className="size-1.5 rounded-full bg-up live-dot" />
            LIVE
          </span>
        }
        footer={
          <div className="tnum flex items-center justify-between font-mono text-[10.5px] text-muted">
            <span className="inline-flex items-center gap-1">
              <ArrowUp size={10.5} strokeWidth={2.5} className="text-c-out" />
              {formatSpeed(stats.up)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDown size={10.5} strokeWidth={2.5} className="text-c-in" />
              {formatSpeed(stats.down)}
            </span>
          </div>
        }
      >
        <span className="text-base sm:text-lg">{formatSpeed(stats.up + stats.down)}</span>
      </StatCell>

      <StatCell
        icon={<HardDriveDownload size={12} strokeWidth={2.2} />}
        tone="var(--color-c-cpu)"
        label={t("traffic")}
        badge={
          <span className="badge-chip rounded px-1.5 py-0.5 font-mono text-[9.5px] text-muted">
            Σ {formatBytes(stats.tin + stats.tout)}
          </span>
        }
        footer={
          <div className="tnum flex items-center justify-between font-mono text-[10.5px] text-muted">
            <span className="inline-flex items-center gap-1">
              <ArrowUp size={10.5} strokeWidth={2.5} className="text-c-out" />
              {formatBytes(stats.tout)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDown size={10.5} strokeWidth={2.5} className="text-c-in" />
              {formatBytes(stats.tin)}
            </span>
          </div>
        }
      >
        <span className="text-base sm:text-lg">{formatBytes(stats.tin + stats.tout)}</span>
      </StatCell>
    </section>
  );
}
