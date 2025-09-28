import React, { useState, useEffect } from 'react';
import { UsersTab } from './UsersTab';
import { GroupsTab } from './GroupsTab';
import { StatisticsTab } from './StatisticsTab';
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
  const [activeTab, setActiveTab] = useState<TabType>('statistics');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

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
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: usersPagination.page.toString(),
        limit: usersPagination.limit.toString(),
      });
      
      if (usersSearchTerm) params.append('search', usersSearchTerm);
      if (usersActiveFilter) params.append('active', usersActiveFilter);

      const token = import.meta.env.VITE_SCIM_TOKEN ?? 'changeme';
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
    setGroupsLoading(true);
    try {
      const params = new URLSearchParams({
        page: groupsPagination.page.toString(),
        limit: groupsPagination.limit.toString(),
      });
      
      if (groupsSearchTerm) params.append('search', groupsSearchTerm);

      const token = import.meta.env.VITE_SCIM_TOKEN ?? 'changeme';
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
    setStatisticsLoading(true);
    try {
      const token = import.meta.env.VITE_SCIM_TOKEN ?? 'changeme';
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
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'groups') {
      fetchGroups();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab, usersPagination.page, usersSearchTerm, usersActiveFilter, groupsPagination.page, groupsSearchTerm]);

  const handleUserClick = (user: User) => {
    // TODO: Show user details modal
    console.log('User clicked:', user);
  };

  const handleGroupClick = (group: Group) => {
    // TODO: Show group details modal
    console.log('Group clicked:', group);
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
    </div>
  );
};