import React, { useState } from 'react';
import type { RequestLogItem } from '../api/client';
import styles from '../app.module.css';

interface Props {
  log: RequestLogItem | null;
  onClose: () => void;
}

export const LogDetail: React.FC<Props> = ({ log, onClose }) => {
  if (!log) return null;
  const [copied, setCopied] = useState<string | null>(null);

  function copy(label: string, data: unknown) {
    try {
      navigator.clipboard.writeText(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  const statusClass = log.status === undefined || log.status === null ? styles.statusOther : (
    log.status >=200 && log.status <300 ? styles.status2xx :
    log.status >=400 && log.status <500 ? styles.status4xx :
    log.status >=500 ? styles.status5xx : styles.statusOther
  );

  const loadingHeaders = log.requestHeaders && (log.requestHeaders as any).loading;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.detailHeader}>
          <h3>{log.method} {log.url}</h3>
          {log.reportableIdentifier && (
            <span className={[styles.statusBadge, styles.statusOther].join(' ')} title="Reportable Identifier">{log.reportableIdentifier}</span>
          )}
          <div className={styles.badgeRow}>
            <span className={[styles.statusBadge, statusClass].join(' ')}>{log.status ?? '—'}</span>
            <span className={styles.meta}>Duration {log.durationMs ?? '—'} ms</span>
          </div>
        </div>
        {log.errorMessage && <p className={styles.errorText}>Error: {log.errorMessage}</p>}

        <section className={styles.section}>
          <div className={styles.flexRow}>
            <h4 className={styles.flexGrow}>Request Headers</h4>
            {!loadingHeaders && log.requestHeaders && <button className={styles.smallBtn} onClick={() => copy('reqHeaders', log.requestHeaders)}>Copy</button>}
          </div>
          {loadingHeaders && <div className={styles.spinner} />}
          {!loadingHeaders && (!log.requestHeaders || Object.keys(log.requestHeaders).length === 0) && <div className={styles.emptyText}>(none)</div>}
          {!loadingHeaders && log.requestHeaders && Object.keys(log.requestHeaders).length > 0 && (
            <pre className={styles.codeBlock}>{JSON.stringify(log.requestHeaders, null, 2)}</pre>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.flexRow}>
            <h4 className={styles.flexGrow}>Response Headers</h4>
            {log.responseHeaders && <button className={styles.smallBtn} onClick={() => copy('resHeaders', log.responseHeaders)}>Copy</button>}
          </div>
          {!log.responseHeaders && <div className={styles.emptyText}>(none)</div>}
          {log.responseHeaders && <pre className={styles.codeBlock}>{JSON.stringify(log.responseHeaders, null, 2)}</pre>}
        </section>

        <section className={styles.section}>
          <div className={styles.flexRow}>
            <h4 className={styles.flexGrow}>Request Body</h4>
            {log.requestBody !== undefined && log.requestBody !== null && (
              <button className={styles.smallBtn} onClick={() => copy('reqBody', log.requestBody)}>Copy</button>
            )}
          </div>
          {log.requestBody === undefined || log.requestBody === null ? (
            <div className={styles.emptyText}>(empty)</div>
          ) : (
            <pre className={styles.codeBlock}>{JSON.stringify(log.requestBody as any, null, 2)}</pre>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.flexRow}>
            <h4 className={styles.flexGrow}>Response Body</h4>
            {log.responseBody !== undefined && log.responseBody !== null && (
              <button className={styles.smallBtn} onClick={() => copy('resBody', log.responseBody)}>Copy</button>
            )}
          </div>
          {log.responseBody === undefined || log.responseBody === null ? (
            <div className={styles.emptyText}>(empty)</div>
          ) : (
            <pre className={styles.codeBlock}>{JSON.stringify(log.responseBody as any, null, 2)}</pre>
          )}
        </section>

        <div className={styles.spaceBetween}>
          <div className={styles.mutedSmall}>{copied && <span>Copied {copied}</span>}</div>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// Inline styles removed; using CSS module classes.
