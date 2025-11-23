import React, { useState, useEffect } from 'react';
import { RequestLogItem } from '../api/client';
import styles from './LogDetail.module.css';

interface LogDetailProps {
  log: RequestLogItem | null;
  onClose: () => void;
}

export const LogDetail: React.FC<LogDetailProps> = ({ log, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const parseContent = (content: any): string => {
    if (typeof content === 'string') {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    }
    return JSON.stringify(content, null, 2);
  };

  const copy = async (type: string, content: any) => {
    try {
      const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      await navigator.clipboard.writeText(textContent);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const downloadLog = () => {
    const exportData = {
      method: log.method,
      url: log.url,
      status: log.status,
      durationMs: log.durationMs,
      timestamp: log.createdAt,
      identifier: log.reportableIdentifier,
      requestHeaders: log.requestHeaders,
      requestBody: log.requestBody ? (typeof log.requestBody === 'string' ? JSON.parse(log.requestBody) : log.requestBody) : null,
      responseHeaders: log.responseHeaders,
      responseBody: log.responseBody ? (typeof log.responseBody === 'string' ? JSON.parse(log.responseBody) : log.responseBody) : null,
      error: log.errorMessage ? {
        message: log.errorMessage,
        stack: log.errorStack
      } : null
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scim-log-${log.method}-${new Date(log.createdAt).toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadgeClass = (status: number): string => {
    if (status >= 200 && status < 300) return styles.statusSuccess;
    if (status >= 400 && status < 500) return styles.statusError;
    if (status >= 500) return styles.statusError;
    return styles.statusOther;
  };

  const getMethodBadgeClass = (method: string): string => {
    switch (method?.toUpperCase()) {
      case 'GET': return styles.methodGet;
      case 'POST': return styles.methodPost;
      case 'PUT': return styles.methodPut;
      case 'PATCH': return styles.methodPatch;
      case 'DELETE': return styles.methodDelete;
      default: return styles.methodOther;
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!log) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <span className={`${styles.methodBadge} ${getMethodBadgeClass(log.method)}`}>
              {log.method}
            </span>
            Request Details
          </h2>
          <div className={styles.headerActions}>
            <button className={styles.downloadButton} onClick={downloadLog} title="Download log as JSON">
              ⬇️ Download
            </button>
            <button className={styles.closeButton} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.requestInfo}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>URL</div>
              <div className={styles.infoValue}>{log.url}</div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Status</div>
              <div className={styles.infoValue}>
                {log.status ? (
                  <span className={`${styles.statusBadge} ${getStatusBadgeClass(log.status)}`}>
                    {log.status}
                  </span>
                ) : '—'}
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Duration</div>
              <div className={styles.infoValue}>{log.durationMs ? `${log.durationMs}ms` : '—'}</div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Timestamp</div>
              <div className={styles.infoValue}>{new Date(log.createdAt).toLocaleString()}</div>
            </div>

            {log.reportableIdentifier && (
              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Identifier</div>
                <div className={styles.infoValue}>{log.reportableIdentifier}</div>
              </div>
            )}

            {log.errorMessage && (
              <div className={`${styles.infoCard} ${styles.errorCard}`}>
                <div className={styles.infoLabel}>Error</div>
                <div className={styles.infoValue}>{log.errorMessage}</div>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>Request Headers</span>
              {log.requestHeaders && (
                <button
                  className={`${styles.copyButton} ${copied === 'reqHeaders' ? styles.copied : ''}`}
                  onClick={() => copy('reqHeaders', log.requestHeaders)}
                >
                  {copied === 'reqHeaders' ? '✓ Copied' : '📋 Copy'}
                </button>
              )}
            </div>
            {!log.requestHeaders || Object.keys(log.requestHeaders).length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <div>No request headers</div>
              </div>
            ) : (
              <pre className={styles.codeBlock}>{JSON.stringify(log.requestHeaders, null, 2)}</pre>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>Response Headers</span>
              {log.responseHeaders && (
                <button
                  className={`${styles.copyButton} ${copied === 'resHeaders' ? styles.copied : ''}`}
                  onClick={() => copy('resHeaders', log.responseHeaders)}
                >
                  {copied === 'resHeaders' ? '✓ Copied' : '📋 Copy'}
                </button>
              )}
            </div>
            {!log.responseHeaders ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <div>No response headers</div>
              </div>
            ) : (
              <pre className={styles.codeBlock}>{JSON.stringify(log.responseHeaders, null, 2)}</pre>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>Request Body</span>
              {log.requestBody !== undefined && log.requestBody !== null && (
                <button
                  className={`${styles.copyButton} ${copied === 'reqBody' ? styles.copied : ''}`}
                  onClick={() => copy('reqBody', log.requestBody)}
                >
                  {copied === 'reqBody' ? '✓ Copied' : '📋 Copy'}
                </button>
              )}
            </div>
            {log.requestBody === undefined || log.requestBody === null ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <div>No request body</div>
              </div>
            ) : (
              <pre className={styles.codeBlock}>{parseContent(log.requestBody)}</pre>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>Response Body</span>
              {log.responseBody !== undefined && log.responseBody !== null && (
                <button
                  className={`${styles.copyButton} ${copied === 'resBody' ? styles.copied : ''}`}
                  onClick={() => copy('resBody', log.responseBody)}
                >
                  {copied === 'resBody' ? '✓ Copied' : '📋 Copy'}
                </button>
              )}
            </div>
            {log.responseBody === undefined || log.responseBody === null ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <div>No response body</div>
              </div>
            ) : (
              <pre className={styles.codeBlock}>{parseContent(log.responseBody)}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
