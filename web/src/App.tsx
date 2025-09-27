import React, { useEffect, useMemo, useState } from 'react';
import { fetchLogs, clearLogs, fetchLog, RequestLogItem, LogQuery, LogListResponse, fetchLocalVersion, VersionInfo } from './api/client';
import { LogList } from './components/LogList';
import { LogDetail } from './components/LogDetail';
import { LogFilters } from './components/LogFilters';
import styles from './app.module.css';

export const App: React.FC = () => {
  const [items, setItems] = useState<RequestLogItem[]>([]);
  const [meta, setMeta] = useState<Omit<LogListResponse,'items'>>();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RequestLogItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogQuery>({ page:1 });
  const [auto, setAuto] = useState(false);
  const [localVersion, setLocalVersion] = useState<VersionInfo | null>(null);
  const [latestTag, setLatestTag] = useState<string | null>(null);
  const [latestNotes, setLatestNotes] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const azResourceGroup = import.meta.env.VITE_AZURE_RESOURCE_GROUP; // optional
  const azContainerApp = import.meta.env.VITE_AZURE_CONTAINER_APP;
  const azImage = import.meta.env.VITE_AZURE_IMAGE; // e.g. myacr.azurecr.io/scimtool
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

  const upgradeCommand = useMemo(() => {
    if (!(upgradeAvailable && latestTag)) return '';
    if (azResourceGroup && azContainerApp && azImage) {
      const imgRef = `${azImage}:${latestTag}`;
      return `az containerapp update -n ${azContainerApp} -g ${azResourceGroup} --image ${imgRef}`;
    }
    return `# Deploy new version\n# Version: ${latestTag}`;
  }, [upgradeAvailable, latestTag, azResourceGroup, azContainerApp, azImage]);

  async function load(applyPageReset = false, override?: LogQuery) {
    setLoading(true);
    setError(null);
    try {
      const q = override
        ? override
        : applyPageReset
          ? { ...filters, page:1 }
          : filters;
      const data = await fetchLogs(q);
      setItems(data.items);
      const { items: _i, ...rest } = data;
      setMeta(rest);
      setFilters(q); // persist any page reset
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
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

  useEffect(() => { load(); }, []);
  useEffect(() => {
    // Local version
    (async () => { try { setLocalVersion(await fetchLocalVersion()); } catch {/* ignore */} })();
    // Latest GitHub release polling
    const fetchLatest = async () => {
      try {
        const releaseRes = await fetch(`https://api.github.com/repos/${githubRepo}/releases/latest`, { headers: { 'Accept': 'application/vnd.github+json' } });
        if (releaseRes.ok) {
          const data = await releaseRes.json();
          if (data?.tag_name) {
            setLatestTag(data.tag_name as string);
            const notes = data.name || data.body || '';
            setLatestNotes(notes.length > 160 ? notes.slice(0,157) + '…' : notes);
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
                setLatestTag(first.name as string);
                setLatestNotes('(from latest git tag – no releases yet)');
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
    if (!auto) return;
    const h = setInterval(() => { if (!loading && !selected) load(); }, 10000);
    return () => clearInterval(h);
  }, [auto, loading, selected, filters]);

  async function handleSelect(partial: RequestLogItem) {
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

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>SCIMTool Logs</h2>
      {upgradeAvailable && latestTag && (
        <div className={styles.upgradeBanner}>
          <span className={styles.upgradeBannerNew}>NEW</span>
          <div className={styles.flex1}>
            <strong>Update available:</strong> {localVersion?.version} → {latestTag}
            {latestNotes && <small>{latestNotes}</small>}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(upgradeCommand).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false), 2500); }); }} disabled={!upgradeCommand}>
            {copied ? 'Copied!' : 'Copy Update Command'}
          </button>
        </div>
      )}
      <p className={styles.subtitle}>Inspect raw SCIM traffic captured by the troubleshooting endpoint.</p>
      {error && <div className={styles.error}>{error}</div>}
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
        <button onClick={handleClear} disabled={loading}>Clear Logs</button>
        {meta && <span className={styles.meta}>Total {meta.total} • Page {meta.page} / {Math.ceil(meta.total / meta.pageSize)}</span>}
        <div className={styles.pager}>
          <button disabled={loading || !meta?.hasPrev} onClick={() => { if (meta?.hasPrev) { const next = { ...filters, page: (filters.page ?? 1) - 1 }; load(false, next); } }}>Prev</button>
          <button disabled={loading || !meta?.hasNext} onClick={() => { if (meta?.hasNext) { const next = { ...filters, page: (filters.page ?? 1) + 1 }; load(false, next); } }}>Next</button>
        </div>
      </div>
  <LogList items={items} loading={loading} onSelect={handleSelect} />
      <LogDetail log={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
