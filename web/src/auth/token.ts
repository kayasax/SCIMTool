export const TOKEN_STORAGE_KEY = 'scimtool.authToken';
export const TOKEN_CHANGED_EVENT = 'scimtool:token-changed';
export const TOKEN_INVALID_EVENT = 'scimtool:token-invalid';

type TokenEventDetail = { token: string | null };

const dispatchTokenEvent = (type: string, token: string | null) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<TokenEventDetail>(type, { detail: { token } }));
};

const getEnvToken = (): string | null => {
  // Allow env token convenience only for local development builds.
  if (import.meta.env.DEV) {
    const value = import.meta.env.VITE_SCIM_TOKEN;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return getEnvToken();
  }
  const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (stored && stored.trim().length > 0) {
    return stored.trim();
  }
  return getEnvToken();
};

export const setStoredToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const trimmed = token.trim();
  window.localStorage.setItem(TOKEN_STORAGE_KEY, trimmed);
  dispatchTokenEvent(TOKEN_CHANGED_EVENT, trimmed);
};

export const clearStoredToken = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  dispatchTokenEvent(TOKEN_CHANGED_EVENT, null);
};

export const notifyTokenInvalid = (): void => {
  dispatchTokenEvent(TOKEN_INVALID_EVENT, null);
};
