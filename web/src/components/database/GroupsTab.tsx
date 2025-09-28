import React from 'react';
import styles from './DatabaseBrowser.module.css';

interface Group {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  // Allow additional fields from SCIM payload (custom mappings)
  [key: string]: any;
}

interface GroupsTabProps {
  groups: Group[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  loading: boolean;
  searchTerm: string;
  onSearch: (term: string) => void;
  onPageChange: (page: number) => void;
  onGroupClick: (group: Group) => void;
}

export const GroupsTab: React.FC<GroupsTabProps> = ({
  groups,
  pagination,
  loading,
  searchTerm,
  onSearch,
  onPageChange,
  onGroupClick,
}) => {
  return (
    <div className={styles.tabContent}>
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading groups...</div>
      ) : (
        <>
          <div className={styles.groupsList}>
            <div className={styles.groupsHeader}>
              <span>Group Name</span>
              <span>Members</span>
              <span>Created</span>
            </div>
            {groups.map((group) => (
              <div
                key={group.id}
                className={styles.groupRow}
                onClick={() => onGroupClick(group)}
              >
                <div className={styles.groupInfo}>
                  <div className={styles.groupName}>
                    {group.displayName}
                    <span className={styles.groupMeta}> • {group.id.slice(-8)}</span>
                  </div>
                </div>
                <div className={styles.groupMembers}>
                  <span className={styles.memberCount}>
                    {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={styles.groupDate}>
                  {new Date(group.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} groups
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