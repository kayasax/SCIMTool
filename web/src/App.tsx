import React, { useEffect, useState } from 'react';
import { fetchLogs, clearLogs, fetchLog, RequestLogItem, LogQuery, LogListResponse } from './api/client';
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
