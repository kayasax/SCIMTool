import React, { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { fetchBackupStats, type BackupStats } from '../api/client';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [backupError, setBackupError] = useState(false);

  useEffect(() => {
    // Fetch backup stats on mount and every 30 seconds
    const fetchStats = async () => {
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
  }, []);

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
                title={`Local DB + Azure Files backup\nBackup count: ${backupStats.backupCount}\nLast backup: ${formatLastBackup(backupStats.lastBackupTime)}`}
              >
                <span className={styles.backupIcon}>💾</span>
                <span className={styles.backupText}>
                  {backupStats.backupCount > 0
                    ? formatLastBackup(backupStats.lastBackupTime)
                    : 'Starting backups...'}
                </span>
              </div>
            )}
          </div>

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