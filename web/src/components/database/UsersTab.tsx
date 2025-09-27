import React from 'react';
import styles from './DatabaseBrowser.module.css';

interface User {
  id: string;
  userName: string;
  scimId: string;
  externalId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  groups: Array<{
    id: string;
    displayName: string;
  }>;
  // Allow additional fields from SCIM payload (custom mappings)
  [key: string]: any;
}

interface UsersTabProps {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  loading: boolean;
  searchTerm: string;
  activeFilter: string;
  onSearch: (term: string) => void;
  onFilterChange: (filter: string) => void;
  onPageChange: (page: number) => void;
  onUserClick: (user: User) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  pagination,
  loading,
  searchTerm,
  activeFilter,
  onSearch,
  onFilterChange,
  onPageChange,
  onUserClick,
}) => {
  return (
    <div className={styles.tabContent}>
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterBox}>
          <select
            value={activeFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Users</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : (
        <>
          <div className={styles.usersList}>
            <div className={styles.usersHeader}>
              <span>User</span>
              <span>Name</span>
              <span>Email</span>
              <span>Status</span>
              <span>Groups</span>
              <span>Created</span>
            </div>
            {users.map((user) => {
              // Extract common SCIM fields from the expanded user object
              const displayName = user.displayName || user.name?.formatted || '';
              const givenName = user.name?.givenName || user.givenName || '';
              const familyName = user.name?.familyName || user.familyName || '';
              const fullName = displayName || `${givenName} ${familyName}`.trim() || '';
              const primaryEmail = user.emails?.[0]?.value || user.email || '';

              return (
                <div
                  key={user.id}
                  className={styles.userRow}
                  onClick={() => onUserClick(user)}
                >
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.userName}</div>
                    <div className={styles.userMeta}>ID: {user.scimId}</div>
                  </div>
                  <div className={styles.userDisplayName}>
                    {fullName || '-'}
                  </div>
                  <div className={styles.userEmail}>
                    {primaryEmail || '-'}
                  </div>
                  <div className={styles.userStatus}>
                    <span className={user.active ? styles.active : styles.inactive}>
                      {user.active ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>
                  <div className={styles.userGroups}>
                    {user.groups.length > 0 ? (
                      <span className={styles.groupCount}>
                        {user.groups.length} group{user.groups.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className={styles.noGroups}>No groups</span>
                    )}
                  </div>
                  <div className={styles.userDate}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </div>
            <div className={styles.paginationControls}>
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={styles.paginationButton}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className={styles.paginationButton}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};