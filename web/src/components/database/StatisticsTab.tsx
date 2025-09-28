import React from 'react';
import styles from './DatabaseBrowser.module.css';

interface Statistics {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  groups: {
    total: number;
  };
  activity: {
    totalRequests: number;
    last24Hours: number;
  };
}

interface StatisticsTabProps {
  statistics: Statistics | null;
  loading: boolean;
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({
  statistics,
  loading,
}) => {
  if (loading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.loading}>Loading statistics...</div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.error}>Failed to load statistics</div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.statisticsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3>👥 Users</h3>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statMain}>
              <span className={styles.statNumber}>{statistics.users.total}</span>
              <span className={styles.statLabel}>Total Users</span>
            </div>
            <div className={styles.statBreakdown}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{statistics.users.active}</span>
                <span className={styles.statLabelSmall}>Active</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{statistics.users.inactive}</span>
                <span className={styles.statLabelSmall}>Inactive</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3>🏢 Groups</h3>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statMain}>
              <span className={styles.statNumber}>{statistics.groups.total}</span>
              <span className={styles.statLabel}>Total Groups</span>
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3>📊 Activity</h3>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statMain}>
              <span className={styles.statNumber}>{statistics.activity.totalRequests}</span>
              <span className={styles.statLabel}>Total Requests</span>
            </div>
            <div className={styles.statBreakdown}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{statistics.activity.last24Hours}</span>
                <span className={styles.statLabelSmall}>Last 24 Hours</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3>💾 Database</h3>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statMain}>
              <span className={styles.statNumber}>SQLite</span>
              <span className={styles.statLabel}>Database Type</span>
            </div>
            <div className={styles.statNote}>
              ⚠️ Data is ephemeral in container environment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};