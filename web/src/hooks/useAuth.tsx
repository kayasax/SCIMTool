import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  TOKEN_CHANGED_EVENT,
  TOKEN_INVALID_EVENT,
  TOKEN_STORAGE_KEY
} from '../auth/token';

interface AuthContextValue {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getStoredToken());

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === TOKEN_STORAGE_KEY) {
        setTokenState(event.newValue ?? null);
      }
    };

    const handleTokenChange = (event: Event) => {
      const custom = event as CustomEvent<{ token: string | null }>;
      setTokenState(custom.detail?.token ?? null);
    };

    const handleTokenInvalid = () => {
      setTokenState(null);
    };

    window.addEventListener('storage', handler);
    window.addEventListener(TOKEN_CHANGED_EVENT, handleTokenChange as EventListener);
    window.addEventListener(TOKEN_INVALID_EVENT, handleTokenInvalid);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener(TOKEN_CHANGED_EVENT, handleTokenChange as EventListener);
      window.removeEventListener(TOKEN_INVALID_EVENT, handleTokenInvalid);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    setToken: (next: string) => {
      setStoredToken(next);
      setTokenState(next);
    },
    clearToken: () => {
      clearStoredToken();
      setTokenState(null);
    }
  }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
