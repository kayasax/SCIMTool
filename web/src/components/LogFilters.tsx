import React, { useCallback, useEffect, useRef } from 'react';
import type { LogQuery } from '../api/client';
import styles from './LogFilters.module.css';

interface Props {
  value: LogQuery;
  onChange: (next: LogQuery) => void;
  onReset: () => void;
  onFilterCommit: (next: LogQuery) => void; // receives latest filters
  loading: boolean;
}

export const LogFilters: React.FC<Props> = ({ value, onChange, onReset, onFilterCommit, loading }) => {
  const debounceRef = useRef<number | null>(null);
  const scheduleCommit = useCallback((next: LogQuery) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onFilterCommit(next);
    }, 350);
  }, [onFilterCommit]);

  const update = useCallback(<K extends keyof LogQuery>(key: K, v: LogQuery[K]) => {
    const next = { ...value, [key]: v, page: 1 }; // reset page on any filter change
    onChange(next);
    scheduleCommit(next);
  }, [value, onChange, scheduleCommit]);

  // commit immediately when loading toggles off and there are pending filter changes (safety)
  useEffect(() => () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); }, []);

  return (
    <div className={styles.wrap}>
      <select aria-label='HTTP Method filter' value={value.method ?? ''} onChange={e => update('method', e.target.value || undefined)} className={styles.sel}>
        <option value=''>Method</option>
        {['GET','POST','PATCH','DELETE'].map(m => <option key={m}>{m}</option>)}
      </select>
      <input aria-label='Status code filter' className={styles.inp} placeholder='Status' value={value.status ?? ''} onChange={e => update('status', e.target.value ? Number(e.target.value) : undefined)} />
      <select aria-label='Error presence filter' className={styles.sel} value={value.hasError === undefined ? '' : value.hasError ? 'yes':'no'} onChange={e => update('hasError', e.target.value === '' ? undefined : e.target.value === 'yes')}>
        <option value=''>Errors?</option>
        <option value='yes'>Only Errors</option>
        <option value='no'>No Errors</option>
      </select>
      <input aria-label='URL contains filter' className={styles.wide} placeholder='URL contains' value={value.urlContains ?? ''} onChange={e => update('urlContains', e.target.value || undefined)} />
      <input aria-label='Search text filter' className={styles.wide} placeholder='Search (url or error)' value={value.search ?? ''} onChange={e => update('search', e.target.value || undefined)} />
      <input aria-label='Since date filter' className={styles.date} type='datetime-local' value={value.since ?? ''} onChange={e => update('since', e.target.value || undefined)} />
      <input aria-label='Until date filter' className={styles.date} type='datetime-local' value={value.until ?? ''} onChange={e => update('until', e.target.value || undefined)} />
      <button className={styles.button} onClick={() => { const reset = { page:1 } as LogQuery; onReset(); onFilterCommit(reset); }} disabled={loading}>Reset</button>
    </div>
  );
};