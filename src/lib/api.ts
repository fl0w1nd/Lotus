import type {
  MetricPeriod,
  MetricType,
  MonitorResponse,
  ServerGroupResponse,
  ServerMetricsResponse,
  ServiceResponse,
  SettingResponse,
} from "@/types/nezha";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} (${url})`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export const fetchSetting = () => get<SettingResponse>("/api/v1/setting");

export const fetchServerGroups = () => get<ServerGroupResponse>("/api/v1/server-group");

export const fetchService = () => get<ServiceResponse>("/api/v1/service");

export const fetchServerMonitor = (serverId: number) =>
  get<MonitorResponse>(`/api/v1/server/${serverId}/service`);

export const fetchServerMetrics = (serverId: number, metric: MetricType, period: MetricPeriod) =>
  get<ServerMetricsResponse>(
    `/api/v1/server/${serverId}/metrics?metric=${metric}&period=${period}`,
  );
