import type {
  MetricPeriod,
  MetricType,
  MonitorPeriod,
  MonitorResponse,
  ProfileResponse,
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

/** 未登录时游客返回 401, 用于探测登录态 */
export const fetchProfile = () => get<ProfileResponse>("/api/v1/profile");

/** period 为 1d 时不携带参数, 兼容不支持 period 的旧版后端 */
export const fetchServerMonitor = (serverId: number, period: MonitorPeriod = "1d") =>
  get<MonitorResponse>(
    `/api/v1/server/${serverId}/service${period === "1d" ? "" : `?period=${period}`}`,
  );

export const fetchServerMetrics = (serverId: number, metric: MetricType, period: MetricPeriod) =>
  get<ServerMetricsResponse>(
    `/api/v1/server/${serverId}/metrics?metric=${metric}&period=${period}`,
  );
