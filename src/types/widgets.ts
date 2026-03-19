export interface CpuCore {
  index: number;
  usage: number;
  frequency: number;
}

export interface DiskInfo {
  name: string;
  mount: string;
  used: number;
  total: number;
}

export interface TempInfo {
  label: string;
  temp_celsius: number;
}

export interface SystemStats {
  cpu_usage_total: number;
  cpu_cores: CpuCore[];
  cpu_brand: string;
  ram_used: number;
  ram_total: number;
  swap_used: number;
  swap_total: number;
  disks: DiskInfo[];
  temperatures: TempInfo[];
  uptime_secs: number;
  os_name: string;
}

export interface ProcessInfo {
  name: string;
  cpu_usage: number;
  memory: number;
  pid: number;
}

export interface UptimeHost {
  id: string;
  name: string;
  url: string;
  interval_secs: number;
}

export interface CheckResult {
  host_id: string;
  status: "up" | "down" | "degraded";
  latency_ms: number | null;
  checked_at: number;
  error: string | null;
}

export type UptimeHistory = Record<string, CheckResult[]>;
export type HostStatus = "up" | "down" | "degraded" | "pending";
