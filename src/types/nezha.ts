/** Nezha v2 (兼容 v1.x) API 数据结构 */

export interface WSResponse {
  now: number;
  servers: NezhaServer[];
}

export interface NezhaServer {
  id: number;
  name: string;
  public_note: string;
  last_active: string;
  country_code: string;
  host: ServerHost;
  state: ServerState;
}

export interface ServerHost {
  platform: string;
  platform_version: string;
  cpu: string[];
  gpu: string[];
  mem_total: number;
  disk_total: number;
  swap_total: number;
  arch: string;
  virtualization?: string;
  boot_time: number;
  version: string;
}

export interface ServerState {
  cpu: number;
  mem_used: number;
  swap_used: number;
  disk_used: number;
  net_in_transfer: number;
  net_out_transfer: number;
  net_in_speed: number;
  net_out_speed: number;
  uptime: number;
  load_1: number;
  load_5: number;
  load_15: number;
  tcp_conn_count: number;
  udp_conn_count: number;
  process_count: number;
  temperatures: { Name: string; Temperature: number }[];
  gpu: number[];
}

export interface ServerGroup {
  group: { id: number; created_at: string; updated_at: string; name: string };
  servers: number[];
}

export interface ServerGroupResponse {
  success: boolean;
  data: ServerGroup[] | null;
}

export interface NezhaMonitor {
  monitor_id: number;
  monitor_name: string;
  display_index?: number;
  server_id: number;
  server_name: string;
  created_at: number[];
  avg_delay: number[];
  packet_loss?: number[];
}

export interface MonitorResponse {
  success: boolean;
  data: NezhaMonitor[] | null;
}

/** 网络监控时间区间; 1d 之外的区间需要登录 (与官方主题行为一致) */
export type MonitorPeriod = "1d" | "7d" | "30d";

export interface ProfileResponse {
  success: boolean;
  data: { id: number; username: string; role: number } | null;
}

export interface ServiceData {
  service_name: string;
  current_up: number;
  current_down: number;
  total_up: number;
  total_down: number;
  delay: number[];
  up: number[];
  down: number[];
}

export interface CycleTransferData {
  name: string;
  from: string;
  to: string;
  max: number;
  server_name: { [serverId: string]: string };
  transfer: { [serverId: string]: number };
  next_update: { [serverId: string]: string };
}

export interface ServiceResponse {
  success: boolean;
  data: {
    services: { [monitorId: string]: ServiceData } | null;
    cycle_transfer_stats: { [cycleId: string]: CycleTransferData } | null;
  };
}

export interface SettingResponse {
  success: boolean;
  data: {
    config: {
      debug?: boolean;
      language: string;
      site_name: string;
      user_template?: string;
      custom_code?: string;
    };
    version: string;
    /** v2 起支持 TSDB 历史指标 */
    tsdb_enabled?: boolean;
  };
}

/** v2 TSDB 历史指标(与后端支持的完整指标集对齐) */
export type MetricType =
  | "cpu"
  | "memory"
  | "swap"
  | "disk"
  | "net_in_speed"
  | "net_out_speed"
  | "net_in_transfer"
  | "net_out_transfer"
  | "load1"
  | "load5"
  | "load15"
  | "tcp_conn"
  | "udp_conn"
  | "process_count"
  | "temperature"
  | "uptime"
  | "gpu";

export type MetricPeriod = "1d" | "7d" | "30d";

export interface ServerMetricsResponse {
  success: boolean;
  data: {
    server_id: number;
    server_name: string;
    metric: string;
    data_points: { ts: number; value: number }[] | null;
  };
}

/** 官方自定义代码全局变量(与官方主题保持兼容) */
declare global {
  interface Window {
    ForceTheme?: "light" | "dark";
    CustomLogo?: string;
    CustomDesc?: string;
    CustomLinks?: string;
    CustomBackgroundImage?: string;
    CustomMobileBackgroundImage?: string;
    ShowNetTransfer?: boolean;
    ForceCardInline?: boolean;
    FixedTopServerName?: boolean;
    ForceShowServices?: boolean;
    ForceUseSvgFlag?: boolean;
    ForceShowMap?: boolean;
  }
}
