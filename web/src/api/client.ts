import { clearStoredToken, getStoredToken, notifyTokenInvalid } from '../auth/token';

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

const buildUrl = (path: string): string => {
  if (!base) return path;
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${normalisedPath}`;
};

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
  includeAdmin?: boolean;
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
  const url = buildUrl(`/scim/admin/logs${qs ? `?${qs}` : ''}`);
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error(`Failed to load logs: ${res.status}`);
  return res.json();
}

export async function clearLogs(): Promise<void> {
  const res = await fetchWithAuth(buildUrl('/scim/admin/logs/clear'), {
    method: 'POST'
  });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to clear logs: ${res.status}`);
}

export async function fetchLog(id: string): Promise<RequestLogItem> {
  const res = await fetchWithAuth(buildUrl(`/scim/admin/logs/${id}`));
  if (!res.ok) throw new Error(`Failed to load log ${id}: ${res.status}`);
  return res.json();
}

// Versioning
export interface DeploymentInfo {
  resourceGroup?: string;
  containerApp?: string;
  registry?: string;
  currentImage?: string;
  backupMode?: 'blob' | 'azureFiles' | 'none';
  blobAccount?: string;
  blobContainer?: string;
}

export interface VersionInfo {
  version: string;
  commit?: string;
  buildTime?: string;
  runtime: { node: string; platform: string };
  deployment?: DeploymentInfo;
}

export async function fetchLocalVersion(): Promise<VersionInfo> {
  const res = await fetchWithAuth(buildUrl('/scim/admin/version'));
  if (!res.ok) throw new Error(`Failed to fetch version: ${res.status}`);
  return res.json();
}

export interface RemoteManifest {
  latest: string; // semver or tag
  notes?: string;
  publishedAt?: string;
  image?: string; // e.g. myacr.azurecr.io/scimtool:0.2.0
}

export async function fetchRemoteManifest(url: string): Promise<RemoteManifest> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch remote manifest: ${res.status}`);
  return res.json();
}

function requireToken(): string {
  const token = getStoredToken();
  if (!token) {
    throw new Error('SCIM authentication token not configured');
  }
  return token;
}

async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? undefined);
  headers.set('Authorization', `Bearer ${requireToken()}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    clearStoredToken();
    notifyTokenInvalid();
    throw new Error('SCIM authentication token rejected (HTTP 401).');
  }
  return response;
}

// Backup status
export interface BackupStats {
  backupCount: number;
  lastBackupTime: string | null;
  localDbPath: string;
  azureFilesBackupPath: string;
  mode: 'blob' | 'azureFiles' | 'none';
  blobMode: boolean;
  lastBackupSucceeded: boolean | null;
  lastError: string | null;
  restoredFromSnapshot: boolean;
  initialRestoreAttempted: boolean;
  hasSnapshots: boolean;
}

export async function fetchBackupStats(): Promise<BackupStats> {
  const res = await fetchWithAuth(buildUrl('/scim/admin/backup/stats'));
  if (!res.ok) throw new Error(`Failed to fetch backup stats: ${res.status}`);
  return res.json();
}

export interface ScimUserResource {
  id: string;
  userName: string;
  externalId?: string | null;
  active?: boolean;
  [key: string]: unknown;
}

export interface ScimGroupResource {
  id: string;
  displayName: string;
  members?: Array<{
    value: string;
    display?: string;
    type?: string;
  }>;
  [key: string]: unknown;
}

export interface ManualUserRequest {
  userName: string;
  externalId?: string;
  active?: boolean;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phoneNumber?: string;
  department?: string;
}

export interface ManualGroupRequest {
  displayName: string;
  scimId?: string;
  memberIds?: string[];
}

async function extractError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed?.detail === 'string') {
          message = parsed.detail;
        } else if (typeof parsed?.message === 'string') {
          message = parsed.message;
        } else {
          message = text;
        }
      } catch {
        message = text;
      }
    }
  } catch {
    // ignore secondary parsing errors
  }
  throw new Error(message);
}

export async function createManualUser(payload: ManualUserRequest): Promise<ScimUserResource> {
  const res = await fetchWithAuth(buildUrl('/scim/admin/users/manual'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    await extractError(res, `Failed to create user (${res.status})`);
  }

  return res.json();
}

export async function createManualGroup(payload: ManualGroupRequest): Promise<ScimGroupResource> {
  const res = await fetchWithAuth(buildUrl('/scim/admin/groups/manual'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    await extractError(res, `Failed to create group (${res.status})`);
  }

  return res.json();
}
