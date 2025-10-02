export const TOKEN_STORAGE_KEY = 'scimtool.authToken';

const getEnvToken = (): string | null => {
  const value = import.meta.env.VITE_SCIM_TOKEN;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
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
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
};

export const clearStoredToken = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};
