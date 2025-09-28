import React from 'react';
import type { RequestLogItem } from '../api/client';
import styles from './LogList.module.css';

interface Props {
  items: RequestLogItem[];
  onSelect: (item: RequestLogItem) => void;
  loading: boolean;
  selected?: RequestLogItem | null;
}

const getStatusBadgeClass = (status: number) => {
  if (status >= 200 && status < 300) return styles.statusSuccess;
  if (status >= 400) return styles.statusError;
  return styles.statusWarning;
};

const getMethodBadgeClass = (method: string) => {
  switch (method.toUpperCase()) {
    case 'GET': return styles.methodGet;
    case 'POST': return styles.methodPost;
    case 'PUT': return styles.methodPut;
    case 'PATCH': return styles.methodPatch;
    case 'DELETE': return styles.methodDelete;
    default: return styles.methodGet;
  }
};

export const LogList: React.FC<Props> = ({ items, onSelect, loading, selected }) => {
  if (loading && items.length === 0) {
    return (
      <div className={styles.logListContainer}>
        <div className={styles.logListHeader}>
          <h3 className={styles.logListTitle}>Request Logs</h3>
        </div>
        <div className={styles.loadingContainer}>
          <div>Loading logs...</div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.logListContainer}>
        <div className={styles.logListHeader}>
          <h3 className={styles.logListTitle}>Request Logs</h3>
        </div>
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>📋</div>
          <div>No SCIM requests logged yet</div>
          <div>Start a provisioning operation to see requests appear here</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.logListContainer}>
      <div className={styles.logListHeader}>
        <h3 className={styles.logListTitle}>Request Logs ({items.length})</h3>
      </div>
      <div className={styles.logListContent}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Method</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Identifier</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => {
              const isSelected = selected?.id === i.id;
              const hasError = i.errorMessage || (i.status && i.status >= 400);

              return (
                <tr
                  key={i.id}
                  className={`${styles.tableRow} ${isSelected ? styles.selected : ''} ${hasError ? styles.error : ''}`}
                  onClick={() => onSelect(i)}
                >
                  <td>
                    <span className={styles.timeBadge}>
                      {new Date(i.createdAt).toLocaleTimeString()}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.methodBadge} ${getMethodBadgeClass(i.method)}`}>
                      {i.method}
                    </span>
                  </td>
                  <td>
                    {i.status && (
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(i.status)}`}>
                        {i.status}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={styles.durationBadge}>
                      {i.durationMs ? `${i.durationMs}ms` : '-'}
                    </span>
                  </td>
                  <td title={i.reportableIdentifier || ''}>
                    {i.reportableIdentifier || '-'}
                  </td>
                  <td title={i.url}>
                    {i.url}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
