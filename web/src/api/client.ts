export interface RequestLogItem {
  id: string;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  createdAt: string;
  errorMessage?: string;
  reportableIdentifier?: string;
  requestHeaders?: Record<string, unknown>;
  responseHeaders?: Record<string, unknown>;
  requestBody?: unknown;
  responseBody?: unknown;
}

// Auto-detect base URL: use environment variable or auto-detect from current origin
const getApiBase = (): string => {
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase) {
    // If environment specifies a base URL, use it (supports both relative and absolute URLs)
    return envBase;
  }
  
  // Auto-detect: if served from same origin, use empty base (client code adds /scim)
  if (typeof window !== 'undefined') {
    return ''; // Empty base for containerized deployment - client code adds /scim
  }
  
  return ''; // Fallback for SSR
};

const base = getApiBase();

export interface LogQuery {
  page?: number;
  pageSize?: number;
  method?: string;
  status?: number;
  hasError?: boolean;
  urlContains?: string;
  since?: string; // ISO
  until?: string; // ISO
  search?: string;
}

export interface LogListResponse {
  items: RequestLogItem[];
  total: number;
  page: number;
  pageSize: number;
  count: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export async function fetchLogs(q: LogQuery = {}): Promise<LogListResponse> {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    params.set(k, String(v));
  });
  const qs = params.toString();
  const url = `${base}/scim/admin/logs${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error(`Failed to load logs: ${res.status}`);
  return res.json();
}

export async function clearLogs(): Promise<void> {
  const res = await fetch(`${base}/scim/admin/logs/clear`, {
    method: 'POST',
    headers: authHeader()
  });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to clear logs: ${res.status}`);
}

export async function fetchLog(id: string): Promise<RequestLogItem> {
  const res = await fetch(`${base}/scim/admin/logs/${id}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`Failed to load log ${id}: ${res.status}`);
  return res.json();
}

function authHeader(): Record<string, string> {
  const token = import.meta.env.VITE_SCIM_TOKEN ?? 'changeme';
  return { Authorization: `Bearer ${token}` };
}
