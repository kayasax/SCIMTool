import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchLogs, clearLogs, fetchLog, RequestLogItem, LogQuery, LogListResponse, fetchLocalVersion, VersionInfo, DeploymentInfo } from './api/client';
import { TOKEN_INVALID_EVENT } from './auth/token';
import { LogList } from './components/LogList';
import { LogDetail } from './components/LogDetail';
import { LogFilters } from './components/LogFilters';
import { Header } from './components/Header';
import { DatabaseBrowser } from './components/database/DatabaseBrowser';
import { ActivityFeed } from './components/activity/ActivityFeed';
import { ManualProvision } from './components/manual/ManualProvision';
import { ThemeProvider } from './hooks/useTheme';
import { useAuth, AuthProvider } from './hooks/useAuth';
import './theme.css';
import styles from './app.module.css';
import { isKeepaliveLog } from './utils/keepalive';

const envDefaultRegistry = (() => {
  if (import.meta.env.VITE_AZURE_REGISTRY) {
    return import.meta.env.VITE_AZURE_REGISTRY as string;
  }
  const rawImage = import.meta.env.VITE_AZURE_IMAGE as string | undefined;
  if (!rawImage) return undefined;
  const withoutTag = rawImage.split(':')[0];
  const segments = withoutTag.split('/');
  return segments.length > 1 ? segments.slice(0, -1).join('/') : undefined;
})();

const ENV_DEPLOYMENT_DEFAULTS: DeploymentInfo = {
  resourceGroup: import.meta.env.VITE_AZURE_RESOURCE_GROUP,
  containerApp: import.meta.env.VITE_AZURE_CONTAINER_APP,
  registry: envDefaultRegistry
};

type AppView = 'logs' | 'database' | 'activity' | 'manual';

const AppContent: React.FC = () => {
  const { token, setToken, clearToken } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('activity');
  const [items, setItems] = useState<RequestLogItem[]>([]);
  const [meta, setMeta] = useState<Omit<LogListResponse,'items'>>();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RequestLogItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogQuery>({ page:1 });
  const [auto, setAuto] = useState(false);
  const [localVersion, setLocalVersion] = useState<VersionInfo | null>(null);
  const [latestTag, setLatestTag] = useState<string | null>(null);
  const [latestTitle, setLatestTitle] = useState<string | null>(null);
  const [latestBody, setLatestBody] = useState<string | null>(null);
  const [latestSource, setLatestSource] = useState<'release' | 'tag' | null>(null);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(() => !token);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);
  const [needsToken, setNeedsToken] = useState(() => !token);
  const [hideKeepalive, setHideKeepalive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('scimtool-hideKeepalive');
    if (stored === null) return true;
    return stored !== 'false';
  });

  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  // Hard-coded upstream GitHub repository for release discovery
  const githubRepo = 'kayasax/SCIMTool';

  // Basic semver normalization + comparison (ignores pre-release precedence nuances)
  function normalize(v?: string | null): string | null {
    if (!v) return null;
    const trimmed = v.trim();
    const noPrefix = trimmed.startsWith('v') ? trimmed.slice(1) : trimmed;
    return noPrefix;
  }

  function semverNewer(remote: string, local: string): boolean {
    const rParts = remote.split('.').map(n => parseInt(n,10));
    const lParts = local.split('.').map(n => parseInt(n,10));
    for (let i=0; i<Math.max(rParts.length,lParts.length); i++) {
      const r = rParts[i] || 0; const l = lParts[i] || 0;
      if (r>l) return true; if (r<l) return false;
    }
    return false; // equal
  }

  const upgradeAvailable = useMemo(() => {
    if (!localVersion || !latestTag) return false;
    const localNorm = normalize(localVersion.version);
    const remoteNorm = normalize(latestTag);
    if (!remoteNorm || !localNorm) return false;
    if (remoteNorm === localNorm) return false;
    return semverNewer(remoteNorm, localNorm);
  }, [localVersion, latestTag]);

  const effectiveDeployment = useMemo<DeploymentInfo>(() => {
    if (!deploymentInfo) {
      return { ...ENV_DEPLOYMENT_DEFAULTS };
    }
    return {
      resourceGroup: deploymentInfo.resourceGroup ?? ENV_DEPLOYMENT_DEFAULTS.resourceGroup,
      containerApp: deploymentInfo.containerApp ?? ENV_DEPLOYMENT_DEFAULTS.containerApp,
      registry: deploymentInfo.registry ?? ENV_DEPLOYMENT_DEFAULTS.registry,
      currentImage: deploymentInfo.currentImage,
      backupMode: deploymentInfo.backupMode,
      blobAccount: deploymentInfo.blobAccount,
      blobContainer: deploymentInfo.blobContainer
    };
  }, [deploymentInfo]);

  const upgradeCommand = useMemo(() => {
    if (!(upgradeAvailable && latestTag)) return '';

    const directUrl = 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-direct.ps1';
    const funcUrl = 'https://raw.githubusercontent.com/kayasax/SCIMTool/master/scripts/update-scimtool-func.ps1';
  const cleanTag = latestTag.startsWith('v') ? latestTag.slice(1) : latestTag;

    const resourceGroup = effectiveDeployment.resourceGroup;
    const containerApp = effectiveDeployment.containerApp;

    if (resourceGroup && containerApp) {
      const psQuote = (value: string) => `'${value.replace(/'/g, "''")}'`;
      const deriveRegistry = (): string | undefined => {
        if (effectiveDeployment.registry) {
          const registryValue = effectiveDeployment.registry;
          if (registryValue.includes('/')) return registryValue;
          if (registryValue === 'ghcr.io') {
            // Derive repository namespace from current image when available
            if (effectiveDeployment.currentImage) {
              const withoutTag = effectiveDeployment.currentImage.split(':')[0];
              const segments = withoutTag.split('/');
              if (segments.length > 1) {
                return segments.slice(0, -1).join('/');
              }
            }
            return 'ghcr.io/kayasax';
          }
          return registryValue;
        }
        if (effectiveDeployment.currentImage) {
          const withoutTag = effectiveDeployment.currentImage.split(':')[0];
          const segments = withoutTag.split('/');
          if (segments.length > 1) {
            return segments.slice(0, -1).join('/');
          }
        }
        return undefined;
      };

      const registry = deriveRegistry();
      const args = [
        `-Version ${psQuote(cleanTag)}`,
        `-ResourceGroup ${psQuote(resourceGroup)}`,
        `-AppName ${psQuote(containerApp)}`,
        '-NoPrompt',
        '-ShowCurrent'
      ];
      if (registry) {
        args.push(`-Registry ${psQuote(registry)}`);
      }
      return `iex (irm '${directUrl}'); Update-SCIMToolDirect ${args.join(' ')}`;
    }

  return `iex (irm '${funcUrl}'); Update-SCIMTool -Version ${cleanTag}`;
  }, [effectiveDeployment, latestTag, upgradeAvailable]);

  useEffect(() => {
    if (showTokenModal) {
      setTokenInput(token ?? '');
      setTokenMessage(null);
    }
  }, [showTokenModal, token]);

  useEffect(() => {
    if (!token) {
      setNeedsToken(true);
      setShowTokenModal(true);
    } else {
      setNeedsToken(false);
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleInvalid = () => {
      setTokenMessage('The previous token was rejected by the API. Please enter a new bearer token.');
      setNeedsToken(true);
      setShowTokenModal(true);
      setTokenInput('');
      setItems([]);
      setSelected(null);
      setMeta(undefined);
    };
    window.addEventListener(TOKEN_INVALID_EVENT, handleInvalid);
    return () => window.removeEventListener(TOKEN_INVALID_EVENT, handleInvalid);
  }, []);

  const load = useCallback(async (applyPageReset = false, override?: LogQuery) => {
    if (!token) {
      setNeedsToken(true);
      setItems([]);
      setMeta(undefined);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const q = override
        ? override
        : applyPageReset
          ? { ...filters, page:1 }
          : filters;
      const data = await fetchLogs(q);
      const filteredItems = data.items.filter(item => !item.url?.includes('/scim/admin/logs'));
      const removedThisPage = data.items.length - filteredItems.length;
      setItems(filteredItems);
      setSelected(prev => {
        if (!prev) return prev;
        return filteredItems.some(item => item.id === prev.id) ? prev : null;
      });
      const { items: _i, ...rest } = data;
      setMeta({
        ...rest,
        count: filteredItems.length,
        total: Math.max(0, rest.total - removedThisPage)
      });
      setFilters(q); // persist any page reset
    } catch (e: any) {
      const message = e?.message ?? 'Unknown error';
      if (typeof message === 'string' && (message.includes('401') || message.includes('not configured'))) {
        setNeedsToken(true);
        setShowTokenModal(true);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  async function handleClear() {
    if (!token) {
      setShowTokenModal(true);
      return;
    }
    if (!confirm('Clear all logs?')) return;
    setLoading(true);
    try {
      await clearLogs();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => {
    // Local version
    if (!token) {
      setLocalVersion(null);
      return;
    }
    (async () => {
      try {
        const info = await fetchLocalVersion();
        setLocalVersion(info);
        setDeploymentInfo(info.deployment ?? null);
      } catch (err: any) {
        setDeploymentInfo(null);
        const message = err?.message ?? '';
        if (typeof message === 'string' && message.includes('401')) {
          setNeedsToken(true);
          setShowTokenModal(true);
        }
      }
    })();
    // Latest GitHub release polling
    const fetchLatest = async () => {
      try {
        const releaseRes = await fetch(`https://api.github.com/repos/${githubRepo}/releases/latest`, { headers: { 'Accept': 'application/vnd.github+json' } });
        if (releaseRes.ok) {
          const data = await releaseRes.json();
          if (data?.tag_name) {
            const tag = data.tag_name as string;
            setLatestTag(tag);
            const title = typeof data.name === 'string' && data.name.trim().length
              ? data.name.trim()
              : tag;
            const body = typeof data.body === 'string' && data.body.trim().length
              ? data.body.trim()
              : null;

            setLatestTitle(title);
            setLatestBody(body);
            setLatestSource(body ? 'release' : null);
            return; // success via release
          }
        } else if (releaseRes.status === 404) {
          // No releases published yet -> fall back to tags list
          const tagRes = await fetch(`https://api.github.com/repos/${githubRepo}/tags?per_page=5`, { headers: { 'Accept': 'application/vnd.github+json' } });
          if (tagRes.ok) {
            const tags = await tagRes.json();
            if (Array.isArray(tags) && tags.length) {
              const first = tags[0];
              if (first?.name) {
                const tag = first.name as string;
                setLatestTag(tag);
                setLatestTitle(tag);
                setLatestBody('(from latest git tag – no releases yet)');
                setLatestSource('tag');
              }
            }
          }
        }
      } catch {/* ignore network / rate limit issues silently */}
    };
    fetchLatest();
    const interval = setInterval(fetchLatest, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [githubRepo]);
  useEffect(() => {
    if (!auto || !token) return;
    const h = setInterval(() => { if (!loading && !selected) load(); }, 10000);
    return () => clearInterval(h);
  }, [auto, loading, selected, load, token]);

  // Refresh logs when switching to Raw Logs tab
  useEffect(() => {
    if (currentView === 'logs' && token) {
      load();
    }
  }, [currentView, load, token]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('scimtool-hideKeepalive', hideKeepalive ? 'true' : 'false');
    }
  }, [hideKeepalive]);

  useEffect(() => {
    if (hideKeepalive && selected && isKeepaliveLog(selected)) {
      setSelected(null);
    }
  }, [hideKeepalive, selected]);

  const visibleItems = useMemo(() => {
    if (!hideKeepalive) return items;
    return items.filter(item => !isKeepaliveLog(item));
  }, [items, hideKeepalive]);

  const suppressedCount = hideKeepalive ? items.length - visibleItems.length : 0;

  const detailLog = hideKeepalive && selected && isKeepaliveLog(selected) ? null : selected;

  async function handleSelect(partial: RequestLogItem) {
    if (!token) {
      setShowTokenModal(true);
      return;
    }
    try {
      // If we already have bodies (e.g., future optimization), just set.
      setSelected({ ...partial, requestHeaders: { loading: true } });
      const full = await fetchLog(partial.id);
      setSelected(full);
    } catch (e: any) {
      setError(e.message);
      setSelected(partial); // fallback to partial
    }
  }

  const handleTokenSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = tokenInput.trim();
    if (!value) {
      setTokenMessage('Token cannot be empty.');
      return;
    }
    setToken(value);
    setShowTokenModal(false);
    setTokenMessage(null);
    setTimeout(() => load(true), 0);
  };

  const handleTokenClear = () => {
    clearToken();
    setTokenInput('');
    setShowTokenModal(true);
    setNeedsToken(true);
    setItems([]);
    setSelected(null);
    setMeta(undefined);
  };

  return (
    <div className={styles.app}>
      <Header
        tokenConfigured={Boolean(token)}
        onChangeToken={() => {
          setTokenInput(token ?? '');
          setTokenMessage(null);
          setShowTokenModal(true);
        }}
      />
      <div className={styles.page}>
      {upgradeAvailable && latestTag && (
        <div className={styles.upgradeBanner}>
          <span className={styles.upgradeBannerNew}>NEW</span>
          <div className={styles.flex1}>
            <strong>Update available:</strong> {localVersion?.version} → {latestTag}
            {latestTitle && <small className={styles.upgradeBannerMeta}>{latestTitle}</small>}
            {latestSource === 'tag' && latestBody && (
              <small className={styles.upgradeBannerMeta}>{latestBody}</small>
            )}
          </div>
          <div className={styles.upgradeBannerActions}>
            {latestSource === 'release' && latestBody && (
              <button
                type="button"
                className={styles.buttonSmall}
                onClick={() => setShowReleaseNotes(true)}
              >
                More
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!upgradeCommand) return;
                navigator.clipboard.writeText(upgradeCommand).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                });
              }}
              disabled={!upgradeCommand}
            >
              {copied ? 'Copied!' : 'Copy Update Command'}
            </button>
          </div>
        </div>
      )}

      {showReleaseNotes && latestBody && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="releaseNotesTitle"
          onClick={() => setShowReleaseNotes(false)}
        >
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.spaceBetween}>
              <h3 id="releaseNotesTitle">
                Release notes – {latestTitle ?? latestTag}
              </h3>
              <button
                type="button"
                className={styles.buttonSmall}
                onClick={() => setShowReleaseNotes(false)}
              >
                Close
              </button>
            </div>
            <div className={styles.releaseNotesBody}>
              {latestBody}
            </div>
          </div>
        </div>
      )}

      {showTokenModal && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tokenModalTitle"
          onClick={() => {
            if (!needsToken) {
              setShowTokenModal(false);
            }
          }}
        >
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.spaceBetween}>
              <h3 id="tokenModalTitle">SCIM Bearer Token</h3>
              <button
                type="button"
                className={styles.buttonSmall}
                onClick={() => {
                  if (!needsToken) {
                    setShowTokenModal(false);
                  }
                }}
              >
                Close
              </button>
            </div>
            <p className={styles.tokenHint}>
              Enter the bearer token configured for this SCIMTool deployment. The value is stored locally in your browser only and never embedded in the app bundle.
            </p>
            <form className={styles.tokenForm} onSubmit={handleTokenSave}>
              <input
                type="password"
                className={styles.tokenInput}
                value={tokenInput}
                onChange={event => setTokenInput(event.target.value)}
                placeholder="e.g. S3cret-Value"
                autoFocus
              />
              {tokenMessage && <div className={styles.error}>{tokenMessage}</div>}
              <div className={styles.tokenActions}>
                {token && (
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={handleTokenClear}
                  >
                    Clear
                  </button>
                )}
                <button type="submit" className={styles.button}>
                  Save Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={styles.viewTabs}>
        <button
          className={`${styles.viewTab} ${currentView === 'activity' ? styles.active : ''}`}
          onClick={() => setCurrentView('activity')}
        >
          📈 Activity Feed
        </button>
        <button
          className={`${styles.viewTab} ${currentView === 'logs' ? styles.active : ''}`}
          onClick={() => setCurrentView('logs')}
        >
          📋 Raw Logs
        </button>
        <button
          className={`${styles.viewTab} ${currentView === 'database' ? styles.active : ''}`}
          onClick={() => setCurrentView('database')}
        >
          🗄️ Database Browser
        </button>
        <button
          className={`${styles.viewTab} ${currentView === 'manual' ? styles.active : ''}`}
          onClick={() => setCurrentView('manual')}
        >
          🧪 Manual Provision
        </button>
      </div>

      {currentView === 'activity' && (
        <ActivityFeed hideKeepalive={hideKeepalive} onHideKeepaliveChange={setHideKeepalive} />
      )}

      {currentView === 'database' && (
        <DatabaseBrowser />
      )}

      {currentView === 'manual' && (
        <ManualProvision />
      )}

      {currentView === 'logs' && (
        <>
          <p className={styles.subtitle}>Inspect raw SCIM traffic captured by the troubleshooting endpoint.</p>
          {error && <div className={styles.error}>{error}</div>}
          {needsToken && (
            <div className={styles.error}>
              Provide the current SCIM bearer token to access logs and admin tools.
            </div>
          )}
          <LogFilters
            value={filters}
            onChange={setFilters}
            onReset={() => { setFilters({ page:1 }); }}
            onFilterCommit={(next) => { load(false, next); }}
            loading={loading}
          />
          <div className={styles.toolbar}>
            <button onClick={() => load()} disabled={loading}>Refresh</button>
            <label className={styles.autoLabel}>
              <input type='checkbox' checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto-refresh
            </label>
            <label className={styles.autoLabel}>
              <input
                type='checkbox'
                checked={hideKeepalive}
                onChange={e => setHideKeepalive(e.target.checked)}
              /> Hide keepalive checks
            </label>
            <button onClick={handleClear} disabled={loading}>Clear Logs</button>
            {meta && <span className={styles.meta}>Total {meta.total} • Page {meta.page} / {Math.ceil(meta.total / meta.pageSize)}</span>}
            <div className={styles.pager}>
              <button disabled={loading || !meta?.hasPrev} onClick={() => { if (meta?.hasPrev) { const next = { ...filters, page: (filters.page ?? 1) - 1 }; load(false, next); } }}>Prev</button>
              <button disabled={loading || !meta?.hasNext} onClick={() => { if (meta?.hasNext) { const next = { ...filters, page: (filters.page ?? 1) + 1 }; load(false, next); } }}>Next</button>
            </div>
          </div>
          {hideKeepalive && suppressedCount > 0 && (
            <div className={styles.info}>
              Hiding {suppressedCount} Entra keepalive check{suppressedCount === 1 ? '' : 's'}. Uncheck "Hide keepalive checks" to view them.
            </div>
          )}
          <LogList items={visibleItems} loading={loading} onSelect={handleSelect} selected={detailLog ?? undefined} />
          <LogDetail log={detailLog} onClose={() => setSelected(null)} />
        </>
      )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span>Made by <strong>Loïc MICHEL</strong></span>
          <span>v{localVersion?.version || '0.8.12'}</span>
          <a
            href="https://github.com/kayasax/SCIMTool"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
};

const AppWithTheme: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export const App = AppWithTheme;

