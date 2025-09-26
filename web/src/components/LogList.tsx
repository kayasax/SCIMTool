import React from 'react';
import type { RequestLogItem } from '../api/client';
import styles from '../app.module.css';

interface Props {
  items: RequestLogItem[];
  onSelect: (item: RequestLogItem) => void;
  loading: boolean;
}

export const LogList: React.FC<Props> = ({ items, onSelect }) => {
  return (
    <div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Method</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Identifier</th>
            <th>URL</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id} className={i.errorMessage ? styles.errRow : undefined} onClick={() => onSelect(i)}>
              <td>{new Date(i.createdAt).toLocaleTimeString()}</td>
              <td>{i.method}</td>
              <td>
                {i.status === undefined || i.status === null ? '—' : (
                  <span
                    className={[
                      styles.statusBadge,
                      i.status >=200 && i.status <300 ? styles.status2xx :
                      i.status >=400 && i.status <500 ? styles.status4xx :
                      i.status >=500 ? styles.status5xx : styles.statusOther
                    ].join(' ')}
                  >{i.status}</span>
                )}
              </td>
              <td>{i.durationMs ?? '—'}</td>
              <td className={styles.mono}>{i.reportableIdentifier ?? '—'}</td>
              <td className={styles.mono}>{i.url}</td>
              <td className={i.errorMessage ? styles.errCell : styles.okCell}>{i.errorMessage ? 'Yes' : ''}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6}>No logs yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
