export interface KeepaliveShape {
  method?: string;
  url?: string;
  status?: number;
  reportableIdentifier?: string | null;
}

const GUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const extractUserNameFilter = (url?: string): string | null => {
  if (!url) return null;
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return null;
  const query = url.slice(queryIndex + 1);
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return null;
  }
  const raw = params.get('filter') ?? params.get('Filter') ?? params.get('FILTER');
  if (!raw) return null;
  const withSpaces = raw.replace(/\+/g, ' ');
  let decoded = withSpaces;
  try {
    decoded = decodeURIComponent(withSpaces);
  } catch {
    // ignore malformed encoding and fall back to best effort
  }
  const match = decoded.match(/userName\s+eq\s+"?([^"\\]+)"?/i);
  if (!match) return null;
  return match[1].trim();
};

export const isKeepaliveLog = (item?: KeepaliveShape | null): boolean => {
  if (!item?.url) return false;
  const method = (item.method ?? '').toUpperCase();
  if (method !== 'GET') return false;
  if (!item.url.includes('/Users')) return false;
  const candidate = extractUserNameFilter(item.url);
  if (!candidate) return false;
  if (!GUID_LIKE.test(candidate)) return false;
  if (item.reportableIdentifier && item.reportableIdentifier.trim().length > 0) return false;
  if (typeof item.status === 'number' && item.status >= 400) return false;
  return true;
};

export const looksLikeKeepaliveFromUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const candidate = extractUserNameFilter(url);
  return !!(candidate && GUID_LIKE.test(candidate));
};
