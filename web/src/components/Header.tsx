import React, { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { fetchBackupStats, type BackupStats } from '../api/client';
import styles from './Header.module.css';

interface HeaderProps {
  onChangeToken: () => void;
  tokenConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onChangeToken, tokenConfigured }) => {
  const { theme, toggleTheme } = useTheme();
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [backupError, setBackupError] = useState(false);

  useEffect(() => {
    // Fetch backup stats on mount and every 30 seconds
    const fetchStats = async () => {
      if (!tokenConfigured) {
        setBackupStats(null);
        setBackupError(false);
        return;
      }
      try {
        const stats = await fetchBackupStats();
        setBackupStats(stats);
        setBackupError(false);
      } catch (err) {
        console.warn('Failed to fetch backup stats:', err);
        setBackupError(true);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [tokenConfigured]);

  const formatLastBackup = (lastBackupTime: string | null): string => {
    if (!lastBackupTime) return 'No backup yet';

    const backupDate = new Date(lastBackupTime);
    const now = new Date();
    const diffMs = now.getTime() - backupDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin === 1) return '1 min ago';
    if (diffMin < 60) return `${diffMin} mins ago`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    return backupDate.toLocaleString();
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="4" fill="var(--color-primary)" />
              <path
                d="M8 11h12M8 15h8M8 19h10"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className={styles.brandText}>
            <h1 className={styles.title}>SCIMTool</h1>
            <p className={styles.subtitle}>SCIM 2.0 Provisioning Monitor</p>
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles.status}>
            <div className={styles.statusIndicator}>
              <div className={styles.statusDot}></div>
              <span className={styles.statusText}>Active</span>
            </div>

            {!backupError && backupStats && (
              <div
                className={styles.backupIndicator}
                title={(() => {
                  const base = [] as string[];
                  base.push(`Mode: ${backupStats.mode}`);
                  if (backupStats.mode === 'blob') {
                    base.push(backupStats.hasSnapshots ? 'Snapshots present' : 'No snapshots yet');
                  } else if (backupStats.mode === 'none') {
                    base.push('NO PERSISTENCE - data will be lost on revision');
                  } else {
                    base.push('Azure Files copy mode (legacy)');
                  }
                  base.push(`Backups: ${backupStats.backupCount}`);
                  if (backupStats.lastBackupTime) base.push(`Last: ${formatLastBackup(backupStats.lastBackupTime)}`);
                  if (backupStats.restoredFromSnapshot) base.push('Restored from snapshot at startup');
                  if (backupStats.lastError) base.push(`Last error: ${backupStats.lastError}`);
                  return base.join('\n');
                })()}
                style={backupStats.mode === 'none' ? { color: 'var(--color-danger)' } : undefined}
              >
                <span className={styles.backupIcon}>
                  {backupStats.mode === 'none' ? '⚠️' : backupStats.mode === 'blob' ? '�' : '�💾'}
                </span>
                <span className={styles.backupText}>
                  {backupStats.mode === 'none'
                    ? 'No persistence'
                    : backupStats.backupCount > 0
                      ? formatLastBackup(backupStats.lastBackupTime)
                      : (backupStats.mode === 'blob' ? 'Waiting snapshot...' : 'Starting...')}
                </span>
              </div>
            )}

            {!tokenConfigured && (
              <span className={styles.tokenStatus}>Token required</span>
            )}
          </div>

          <button
            className={styles.tokenButton}
            onClick={onChangeToken}
            title={tokenConfigured ? 'Update SCIM bearer token' : 'Set SCIM bearer token'}
          >
            {tokenConfigured ? 'Change Token' : 'Set Token'}
          </button>

          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  );
};