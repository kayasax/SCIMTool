import React, { useState, useEffect } from 'react';
import styles from './ActivityFeed.module.css';

interface ActivitySummary {
  id: string;
  timestamp: string;
  icon: string;
  message: string;
  details?: string;
  type: 'user' | 'group' | 'system' | 'error';
  severity: 'info' | 'success' | 'warning' | 'error';
  userIdentifier?: string;
  groupIdentifier?: string;
}

interface ActivityFeedProps {
  // Props will be added when integrated with main app
}

export const ActivityFeed: React.FC<ActivityFeedProps> = () => {
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    search: '',
  });
  const [summary, setSummary] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (filters.type) params.append('type', filters.type);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.search) params.append('search', filters.search);

      const token = import.meta.env.VITE_SCIM_TOKEN ?? 'changeme';
      const response = await fetch(`/scim/admin/activity?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      setActivities(data.activities);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = import.meta.env.VITE_SCIM_TOKEN ?? 'changeme';
      const response = await fetch('/scim/admin/activity/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch activity summary');
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching activity summary:', error);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchSummary();

    // Auto-refresh every 10 seconds when enabled
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchActivities();
        fetchSummary();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [pagination.page, filters.type, filters.severity, filters.search, autoRefresh]);

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'success': return styles.success;
      case 'warning': return styles.warning;
      case 'error': return styles.error;
      default: return styles.info;
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'user': return styles.userActivity;
      case 'group': return styles.groupActivity;
      case 'system': return styles.systemActivity;
      default: return '';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={styles.activityFeed}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Activity Feed</h2>
          <p>Human-readable view of SCIM provisioning activities</p>
        </div>
        
        {summary && (
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{summary.last24Hours}</div>
              <div className={styles.summaryLabel}>Last 24 hours</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{summary.lastWeek}</div>
              <div className={styles.summaryLabel}>Last 7 days</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{summary.operations.users}</div>
              <div className={styles.summaryLabel}>User operations</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{summary.operations.groups}</div>
              <div className={styles.summaryLabel}>Group operations</div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search activities..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className={styles.filterSelect}
            title="Filter by activity type"
          >
            <option value="">All Types</option>
            <option value="user">👤 Users</option>
            <option value="group">🏢 Groups</option>
            <option value="system">⚙️ System</option>
          </select>
          
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className={styles.filterSelect}
            title="Filter by severity"
          >
            <option value="">All Severities</option>
            <option value="success">✅ Success</option>
            <option value="info">ℹ️ Info</option>
            <option value="warning">⚠️ Warning</option>
            <option value="error">❌ Error</option>
          </select>
        </div>
        
        <div className={styles.autoRefreshGroup}>
          <label className={styles.autoRefreshLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className={styles.autoRefreshCheckbox}
            />
            🔄 Auto-refresh (10s)
          </label>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading activities...</div>
      ) : (
        <>
          <div className={styles.activitiesList}>
            {activities.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <h3>No activities found</h3>
                <p>SCIM activities will appear here as they happen</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`${styles.activityItem} ${getSeverityClass(activity.severity)} ${getTypeClass(activity.type)}`}
                >
                  <div className={styles.activityIcon}>
                    {activity.icon}
                  </div>
                  
                  <div className={styles.activityContent}>
                    <div className={styles.activityMessage}>
                      {activity.message}
                    </div>
                    
                    {activity.details && (
                      <div className={styles.activityDetails}>
                        {activity.details}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.activityMeta}>
                    <div className={styles.activityTime}>
                      {formatTimestamp(activity.timestamp)}
                    </div>
                    <div className={styles.activityType}>
                      {activity.type}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {activities.length > 0 && (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} activities
              </div>
              <div className={styles.paginationControls}>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={styles.paginationButton}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};