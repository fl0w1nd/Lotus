import NumberFlow from "@number-flow/react";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { formatBytes, formatSpeed, isServerOnline } from "@/lib/utils";
import { useNezhaWS } from "@/lib/ws";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 first:pl-5 sm:px-6">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-faint">{label}</span>
      <span className="tnum font-mono text-lg font-medium leading-none tracking-tight sm:text-xl">
        {children}
      </span>
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
    const regions = new Set(servers.map((s) => s.country_code).filter(Boolean));
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
    return {
      total: servers.length,
      online: online.length,
      regions: regions.size,
      up,
      down,
      tin,
      tout,
    };
  }, [snapshot]);

  return (
    <section className="card grid grid-cols-2 divide-x divide-line md:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line md:[&>*:nth-child(n+3)]:border-t-0">
      <Stat label={t("online")}>
        <span className="inline-flex items-baseline gap-1">
          <span className="text-up">
            <NumberFlow value={stats.online} />
          </span>
          <span className="text-sm text-faint">/ {stats.total}</span>
        </span>
      </Stat>
      <Stat label={t("regions")}>
        <NumberFlow value={stats.regions} />
      </Stat>
      <Stat label={t("netSpeed")}>
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[13px] sm:text-base">
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[10px] text-c-out">↑</span>
            {formatSpeed(stats.up)}
          </span>
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[10px] text-c-in">↓</span>
            {formatSpeed(stats.down)}
          </span>
        </span>
      </Stat>
      <Stat label={t("traffic")}>
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[13px] sm:text-base">
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[10px] text-c-out">↑</span>
            {formatBytes(stats.tout)}
          </span>
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[10px] text-c-in">↓</span>
            {formatBytes(stats.tin)}
          </span>
        </span>
      </Stat>
    </section>
  );
}
