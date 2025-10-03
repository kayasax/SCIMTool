import React, { useState, useEffect } from 'react';
import styles from './ActivityFeed.module.css';
import { useAuth } from '../../hooks/useAuth';

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
  addedMembers?: { id: string; name: string }[];
  removedMembers?: { id: string; name: string }[];
}

interface ActivityFeedProps {
  // Props will be added when integrated with main app
}

export const ActivityFeed: React.FC<ActivityFeedProps> = () => {
  const { token } = useAuth();
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const [lastActivityId, setLastActivityId] = useState<string>('');

  // Store last activity ID in localStorage for persistence across component re-renders
  const storeLastActivityId = (id: string) => {
    setLastActivityId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('scimtool-last-activity-id', id);
    }
  };

  const getStoredLastActivityId = () => {
    if (typeof window === 'undefined') return lastActivityId;
    const stored = localStorage.getItem('scimtool-last-activity-id');
    return stored || lastActivityId;
  };

  const updateTabTitle = (count: number) => {
    const baseTitle = 'SCIMTool - SCIM 2.0 Provisioning Monitor';

    if (count > 0) {
      const newTitle = `(${count}) ${baseTitle}`;
      document.title = newTitle;
      updateFavicon(count);
    } else {
      document.title = baseTitle;
      updateFavicon(0);
    }
  };

  const updateFavicon = (count: number) => {
    try {
      // Create a canvas to draw the favicon with notification badge
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 32;
      canvas.height = 32;

      if (!ctx) {
        console.error('❌ Failed to get canvas context for favicon');
        return;
      }

      // Draw base favicon (blue circle with "S")
      ctx.fillStyle = '#0078d4';
      ctx.beginPath();
      ctx.arc(16, 16, 15, 0, 2 * Math.PI);
      ctx.fill();

      // Add "S" text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', 16, 16);

      // Add notification badge if count > 0
      if (count > 0) {
        // Red notification circle
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(24, 8, 7, 0, 2 * Math.PI);
        ctx.fill();

        // White border (draw before text)
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(24, 8, 7, 0, 2 * Math.PI);
        ctx.stroke();

        // Notification count text (draw last so it's on top)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayCount = count > 9 ? '9+' : count.toString();
        ctx.fillText(displayCount, 24, 8);
      }

      // Generate the data URL
      const dataURL = canvas.toDataURL('image/png');

      // Update or create favicon
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;

      if (favicon) {
        favicon.href = dataURL;
      } else {
        // Remove any existing favicon elements first
        const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
        existingFavicons.forEach(el => el.remove());

        // Create new favicon link
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.type = 'image/png';
        newFavicon.href = dataURL;
        document.head.appendChild(newFavicon);

        // Also add as shortcut icon for better browser compatibility
        const shortcutIcon = document.createElement('link');
        shortcutIcon.rel = 'shortcut icon';
        shortcutIcon.type = 'image/png';
        shortcutIcon.href = dataURL;
        document.head.appendChild(shortcutIcon);
      }

      // Force browser refresh by adding timestamp
      const timestamp = Date.now();
      favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon && !favicon.href.includes('?')) {
        favicon.href = `${dataURL}?t=${timestamp}`;
      }
    } catch (error) {
      console.error('❌ Error updating favicon:', error);
    }
  };

  const clearNewActivityBadge = () => {
    setNewActivityCount(0);
    updateTabTitle(0);
  };

  const fetchActivities = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      if (!token) {
        return;
      }
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.type) params.append('type', filters.type);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/scim/admin/activity?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch activities');

      const data = await response.json();

      // Check for new activities when doing silent refresh
      if (silent && data.activities?.length > 0) {
        const latestActivity = data.activities[0];
        const storedLastActivityId = getStoredLastActivityId();

        // If we have a last known activity ID and it's different from the latest
        if (storedLastActivityId && latestActivity.id !== storedLastActivityId) {
          // Count new activities since last known activity
          const lastActivityIndex = data.activities.findIndex((activity: ActivitySummary) => activity.id === storedLastActivityId);
          const newCount = lastActivityIndex === -1 ? data.activities.length : lastActivityIndex;

          if (newCount > 0) {
            const updatedCount = newActivityCount + newCount;
            setNewActivityCount(updatedCount);
            updateTabTitle(updatedCount);
          }
        } else if (!storedLastActivityId && data.activities.length > 0) {
          // If no last activity ID is stored, this is first time - just set the baseline
          storeLastActivityId(latestActivity.id);
        }

        // Always update last known activity ID for future comparisons
        if (latestActivity && latestActivity.id !== storedLastActivityId) {
          storeLastActivityId(latestActivity.id);
        }
      } else if (!silent && data.activities?.length > 0) {
        // Initial load or manual refresh - set baseline but don't clear existing badge
        storeLastActivityId(data.activities[0].id);
        // Only clear badge count if this is truly the first load (no activities in state yet)
        if (activities.length === 0) {
          setNewActivityCount(0);
          updateTabTitle(0);
        }
      }

      setActivities(data.activities);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  const fetchSummary = async () => {
    try {
      if (!token) {
        setSummary(null);
        return;
      }
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

  // Initialize stored activity ID on component mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('scimtool-last-activity-id');
    if (stored && !lastActivityId) {
      setLastActivityId(stored);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setActivities([]);
      setSummary(null);
      return;
    }

    fetchActivities();
    fetchSummary();

    // Auto-refresh every 10 seconds when enabled
    if (autoRefresh && token) {
      const interval = setInterval(() => {
        fetchActivities(true); // Silent refresh - no loading state
        fetchSummary();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [pagination.page, filters.type, filters.severity, filters.search, autoRefresh, token]);

  // Clear badge when user focuses on the tab - but wait a moment to let them see it
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && newActivityCount > 0) {
        setTimeout(() => {
          if (newActivityCount > 0) {
            clearNewActivityBadge();
          }
        }, 3000); // Give user 3 seconds to see the badge
      }
    };

    const handleFocus = () => {
      if (newActivityCount > 0) {
        setTimeout(() => {
          if (newActivityCount > 0) {
            clearNewActivityBadge();
          }
        }, 3000); // Give user 3 seconds to see the badge
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [newActivityCount]);

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
          <h2>
            Activity Feed
            {newActivityCount > 0 && (
              <span className={styles.newActivityBadge} onClick={clearNewActivityBadge}>
                {newActivityCount}
              </span>
            )}
          </h2>
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
            <span className={`${styles.refreshIcon} ${isRefreshing ? styles.refreshing : ''}`}>
              🔄
            </span>
            Auto-refresh (10s)
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
                        {(activity.addedMembers?.length || activity.removedMembers?.length) && (
                          <div className={styles.memberChanges}>
                            {activity.addedMembers?.length ? (
                              <div className={styles.memberSection}>
                                <strong>Added:</strong>{' '}
                                {activity.addedMembers.map(m => m.name || m.id).join(', ')}
                              </div>
                            ) : null}
                            {activity.removedMembers?.length ? (
                              <div className={styles.memberSection}>
                                <strong>Removed:</strong>{' '}
                                {activity.removedMembers.map(m => m.name || m.id).join(', ')}
                              </div>
                            ) : null}
                          </div>
                        )}
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