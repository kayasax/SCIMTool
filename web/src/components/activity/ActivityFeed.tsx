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
  isKeepalive?: boolean;
}

interface ActivityFeedProps {
  hideKeepalive: boolean;
  onHideKeepaliveChange: (next: boolean) => void;
}

const isKeepaliveActivity = (activity: ActivitySummary | undefined): boolean => !!activity?.isKeepalive;

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ hideKeepalive, onHideKeepaliveChange }) => {
  const { token } = useAuth();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivitySummary[]>([]);
  const [suppressedCount, setSuppressedCount] = useState(0);
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
      const targetPage = pagination.page;
      const limit = pagination.limit;

  const aggregatedActivities: ActivitySummary[] = [];
  let aggregatedFiltered: ActivitySummary[] = [];
  let keepaliveHidden = 0;
      let currentPage = targetPage;
      let lastPagination = pagination;

      for (let iteration = 0; iteration < 5; iteration += 1) {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: limit.toString(),
        });

        if (filters.type) params.append('type', filters.type);
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.search) params.append('search', filters.search);

        const response = await fetch(`/scim/admin/activity?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch activities');

        const data = await response.json();
        lastPagination = data.pagination;

        const pageActivities: ActivitySummary[] = Array.isArray(data.activities) ? data.activities : [];
        aggregatedActivities.push(...pageActivities);

        aggregatedFiltered = hideKeepalive
          ? aggregatedActivities.filter((activity) => !isKeepaliveActivity(activity))
          : [...aggregatedActivities];

        if (hideKeepalive) {
          keepaliveHidden += pageActivities.reduce((count, activity) => count + (isKeepaliveActivity(activity) ? 1 : 0), 0);
        }

  const hasEnoughVisible = !hideKeepalive || aggregatedFiltered.length >= limit;
        const reachedEnd = data.pagination.page >= data.pagination.pages;

        if (hasEnoughVisible || reachedEnd) {
          break;
        }

        currentPage += 1;
      }

  const trimmedVisible = aggregatedFiltered.slice(0, limit);

      if (silent) {
        if (trimmedVisible.length > 0) {
          const latestRelevant = trimmedVisible[0];
          const storedLastActivityId = getStoredLastActivityId();

          if (storedLastActivityId && latestRelevant.id !== storedLastActivityId) {
            const lastActivityIndex = trimmedVisible.findIndex((activity) => activity.id === storedLastActivityId);
            const newCount = lastActivityIndex === -1 ? trimmedVisible.length : lastActivityIndex;

            if (newCount > 0) {
              const updatedCount = newActivityCount + newCount;
              setNewActivityCount(updatedCount);
              updateTabTitle(updatedCount);
            }
          } else if (!storedLastActivityId) {
            storeLastActivityId(latestRelevant.id);
          }

          if (latestRelevant && latestRelevant.id !== storedLastActivityId) {
            storeLastActivityId(latestRelevant.id);
          }
        }
      } else {
        if (trimmedVisible.length > 0) {
          storeLastActivityId(trimmedVisible[0].id);
        }
        if (filteredActivities.length === 0) {
          setNewActivityCount(0);
          updateTabTitle(0);
        }
      }

  setActivities(aggregatedActivities.slice(0, limit));
  setFilteredActivities(trimmedVisible);
  setSuppressedCount(keepaliveHidden);
  setPagination(prev => ({ ...prev, ...lastPagination, page: targetPage }));
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
      setFilteredActivities([]);
      setSuppressedCount(0);
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
  }, [pagination.page, filters.type, filters.severity, filters.search, autoRefresh, token, hideKeepalive]);

  useEffect(() => {
    if (hideKeepalive) {
      setPagination(prev => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    }
  }, [hideKeepalive]);

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
    setPagination(prev => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    if (page === pagination.page) return;
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

  const visibleActivities = hideKeepalive ? filteredActivities : activities;
  const suppressedActivities = hideKeepalive ? suppressedCount : 0;

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

        <div className={styles.keepaliveToggle}>
          <label>
            <input
              type="checkbox"
              checked={hideKeepalive}
              onChange={(e) => onHideKeepaliveChange(e.target.checked)}
            />
            Hide keepalive checks
          </label>
        </div>
      </div>

      {hideKeepalive && suppressedActivities > 0 && (
        <div className={styles.keepaliveInfo}>
          Hiding {suppressedActivities} Entra keepalive check{suppressedActivities === 1 ? '' : 's'}. Uncheck "Hide keepalive checks" to view them.
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading activities...</div>
      ) : (
        <>
          <div className={styles.activitiesList}>
            {visibleActivities.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <h3>No activities found</h3>
                <p>{hideKeepalive && suppressedActivities > 0 ? 'All recent activity items are Entra keepalive checks.' : 'SCIM activities will appear here as they happen'}</p>
              </div>
            ) : (
              visibleActivities.map((activity) => (
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

          {(activities.length > 0 || filteredActivities.length > 0) && (
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