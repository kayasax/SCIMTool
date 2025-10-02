import React, { useState, useEffect } from 'react';
import { UsersTab } from './UsersTab';
import { GroupsTab } from './GroupsTab';
import { StatisticsTab } from './StatisticsTab';
import styles from './DatabaseBrowser.module.css';
import { useAuth } from '../../hooks/useAuth';

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
}

interface Group {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

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

type TabType = 'statistics' | 'users' | 'groups';

export const DatabaseBrowser: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('statistics');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Users state
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [usersSearchTerm, setUsersSearchTerm] = useState('');
  const [usersActiveFilter, setUsersActiveFilter] = useState('');

  // Groups state
  const [groupsPagination, setGroupsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [groupsSearchTerm, setGroupsSearchTerm] = useState('');

  const fetchUsers = async () => {
    if (!token) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: usersPagination.page.toString(),
        limit: usersPagination.limit.toString(),
      });

      if (usersSearchTerm) params.append('search', usersSearchTerm);
      if (usersActiveFilter) params.append('active', usersActiveFilter);
      const response = await fetch(`/scim/admin/database/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
      setUsersPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchGroups = async () => {
    if (!token) {
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    setGroupsLoading(true);
    try {
      const params = new URLSearchParams({
        page: groupsPagination.page.toString(),
        limit: groupsPagination.limit.toString(),
      });

      if (groupsSearchTerm) params.append('search', groupsSearchTerm);
      const response = await fetch(`/scim/admin/database/groups?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch groups');

      const data = await response.json();
      setGroups(data.groups);
      setGroupsPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    if (!token) {
      setStatistics(null);
      setStatisticsLoading(false);
      return;
    }

    setStatisticsLoading(true);
    try {
      const response = await fetch('/scim/admin/database/statistics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch statistics');

      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setStatisticsLoading(false);
    }
  };

  // Load data when tab changes or search/filter changes
  useEffect(() => {
    if (!token) {
      setStatistics(null);
      if (activeTab === 'users') {
        setUsers([]);
      }
      if (activeTab === 'groups') {
        setGroups([]);
      }
      return;
    }

    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'groups') {
      fetchGroups();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab, usersPagination.page, usersSearchTerm, usersActiveFilter, groupsPagination.page, groupsSearchTerm, token]);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleGroupClick = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setSelectedGroup(null);
  };

  const handleUsersSearch = (term: string) => {
    setUsersSearchTerm(term);
    setUsersPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleUsersFilterChange = (filter: string) => {
    setUsersActiveFilter(filter);
    setUsersPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleUsersPageChange = (page: number) => {
    setUsersPagination(prev => ({ ...prev, page }));
  };

  const handleGroupsSearch = (term: string) => {
    setGroupsSearchTerm(term);
    setGroupsPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleGroupsPageChange = (page: number) => {
    setGroupsPagination(prev => ({ ...prev, page }));
  };

  return (
    <div className={styles.databaseBrowser}>
      <div className={styles.header}>
        <h2>Database Browser</h2>
        <p>Browse and manage SCIM Users, Groups, and view system statistics</p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'statistics' ? styles.active : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          📊 Statistics
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users ({statistics?.users.total || 0})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          🏢 Groups ({statistics?.groups.total || 0})
        </button>
      </div>

      <div className={styles.tabContainer}>
        {activeTab === 'statistics' && (
          <StatisticsTab statistics={statistics} loading={statisticsLoading} />
        )}
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            pagination={usersPagination}
            loading={usersLoading}
            searchTerm={usersSearchTerm}
            activeFilter={usersActiveFilter}
            onSearch={handleUsersSearch}
            onFilterChange={handleUsersFilterChange}
            onPageChange={handleUsersPageChange}
            onUserClick={handleUserClick}
          />
        )}
        {activeTab === 'groups' && (
          <GroupsTab
            groups={groups}
            pagination={groupsPagination}
            loading={groupsLoading}
            searchTerm={groupsSearchTerm}
            onSearch={handleGroupsSearch}
            onPageChange={handleGroupsPageChange}
            onGroupClick={handleGroupClick}
          />
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className={styles.modalOverlay} onClick={closeUserModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>User Details</h3>
              <button className={styles.closeButton} onClick={closeUserModal}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <strong>Username:</strong>
                  <span>{selectedUser.userName}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>SCIM ID:</strong>
                  <span>{selectedUser.scimId}</span>
                </div>
                {selectedUser.externalId && (
                  <div className={styles.detailItem}>
                    <strong>External ID:</strong>
                    <span>{selectedUser.externalId}</span>
                  </div>
                )}
                <div className={styles.detailItem}>
                  <strong>Status:</strong>
                  <span className={selectedUser.active ? styles.active : styles.inactive}>
                    {selectedUser.active ? '✅ Active' : '❌ Inactive'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Created:</strong>
                  <span>{new Date(selectedUser.createdAt).toLocaleString()}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Updated:</strong>
                  <span>{new Date(selectedUser.updatedAt).toLocaleString()}</span>
                </div>

                {/* Display SCIM attributes */}
                {(selectedUser as any).displayName && (
                  <div className={styles.detailItem}>
                    <strong>Display Name:</strong>
                    <span>{(selectedUser as any).displayName}</span>
                  </div>
                )}
                {(selectedUser as any).name && (
                  <>
                    {(selectedUser as any).name.givenName && (
                      <div className={styles.detailItem}>
                        <strong>First Name:</strong>
                        <span>{(selectedUser as any).name.givenName}</span>
                      </div>
                    )}
                    {(selectedUser as any).name.familyName && (
                      <div className={styles.detailItem}>
                        <strong>Last Name:</strong>
                        <span>{(selectedUser as any).name.familyName}</span>
                      </div>
                    )}
                  </>
                )}
                {(selectedUser as any).emails && (selectedUser as any).emails.length > 0 && (
                  <div className={styles.detailItem}>
                    <strong>Email:</strong>
                    <span>{(selectedUser as any).emails[0].value}</span>
                  </div>
                )}

                {/* Groups */}
                <div className={styles.detailItem}>
                  <strong>Groups:</strong>
                  <div className={styles.groupsList}>
                    {selectedUser.groups.length > 0 ? (
                      selectedUser.groups.map((group) => (
                        <span key={group.id} className={styles.groupBadge}>
                          {group.displayName}
                        </span>
                      ))
                    ) : (
                      <span className={styles.noGroups}>No groups assigned</span>
                    )}
                  </div>
                </div>

                {/* Raw JSON for debugging */}
                <div className={styles.detailItem}>
                  <strong>Raw Data:</strong>
                  <pre className={styles.jsonData}>
                    {JSON.stringify(selectedUser, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Details Modal */}
      {showGroupModal && selectedGroup && (
        <div className={styles.modalOverlay} onClick={closeGroupModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Group Details</h3>
              <button className={styles.closeButton} onClick={closeGroupModal}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <strong>Display Name:</strong>
                  <span>{selectedGroup.displayName}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>ID:</strong>
                  <span>{selectedGroup.id}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Member Count:</strong>
                  <span>{selectedGroup.memberCount} members</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Created:</strong>
                  <span>{new Date(selectedGroup.createdAt).toLocaleString()}</span>
                </div>
                <div className={styles.detailItem}>
                  <strong>Updated:</strong>
                  <span>{new Date(selectedGroup.updatedAt).toLocaleString()}</span>
                </div>

                {/* Raw JSON for debugging */}
                <div className={styles.detailItem}>
                  <strong>Raw Data:</strong>
                  <pre className={styles.jsonData}>
                    {JSON.stringify(selectedGroup, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};