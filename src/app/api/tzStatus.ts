const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export type ServiceStatus = "up" | "down" | "degraded" | null;

export interface StatusItem {
  id: number;
  service: string;
  category: string;
  is_up: boolean | null;
  status: ServiceStatus;
  response_time_ms: number | null;
  last_checked: string | null;
}

export interface HourlyBucket {
  hour: number;
  uptime_pct: number;
  avg_response_ms: number | null;
  sample_count: number;
}

export interface DailyBucket {
  date: string;
  uptime_pct: number;
  avg_response_ms: number | null;
  sample_count: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`API ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function fetchStatus(): Promise<StatusItem[]> {
  return request<StatusItem[]>("/status");
}

export function fetchHourlyAnalytics(serviceId: number, days = 7) {
  return request<{ service_id: number; days_analyzed: number; hourly: HourlyBucket[] }>(
    `/analytics/${serviceId}/hourly?days=${days}`,
  );
}

export function fetchDailyAnalytics(serviceId: number, days = 30) {
  return request<{ service_id: number; days_analyzed: number; daily: DailyBucket[] }>(
    `/analytics/${serviceId}/daily?days=${days}`,
  );
}

export function reportOutage(serviceId: number, region?: string) {
  const query = region ? `?region=${encodeURIComponent(region)}` : "";
  return request<{ message: string; report_id: number }>(`/report/${serviceId}${query}`, {
    method: "POST",
  });
}
