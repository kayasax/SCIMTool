import React, { FormEvent, useState } from 'react';

import {
  createManualGroup,
  createManualUser,
  ManualGroupRequest,
  ManualUserRequest,
  ScimGroupResource,
  ScimUserResource
} from '../../api/client';
import styles from './ManualProvision.module.css';

const initialUserState = {
  userName: '',
  externalId: '',
  displayName: '',
  givenName: '',
  familyName: '',
  email: '',
  phoneNumber: '',
  department: '',
  active: true
};

const initialGroupState = {
  displayName: '',
  scimId: '',
  memberText: ''
};

export const ManualProvision: React.FC = () => {
  const [userForm, setUserForm] = useState(initialUserState);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userResult, setUserResult] = useState<ScimUserResource | null>(null);

  const [groupForm, setGroupForm] = useState(initialGroupState);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupResult, setGroupResult] = useState<ScimGroupResource | null>(null);

  const resetUserResult = () => {
    setUserError(null);
    setUserResult(null);
  };

  const resetGroupResult = () => {
    setGroupError(null);
    setGroupResult(null);
  };

  const handleUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetUserResult();

    const payload: ManualUserRequest = {
      userName: userForm.userName.trim(),
      active: userForm.active
    };

    if (userForm.externalId.trim()) payload.externalId = userForm.externalId.trim();
    if (userForm.displayName.trim()) payload.displayName = userForm.displayName.trim();
    if (userForm.givenName.trim()) payload.givenName = userForm.givenName.trim();
    if (userForm.familyName.trim()) payload.familyName = userForm.familyName.trim();
    if (userForm.email.trim()) payload.email = userForm.email.trim();
    if (userForm.phoneNumber.trim()) payload.phoneNumber = userForm.phoneNumber.trim();
    if (userForm.department.trim()) payload.department = userForm.department.trim();

    setUserLoading(true);
    try {
      const resource = await createManualUser(payload);
      setUserResult(resource);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Failed to create user.');
    } finally {
      setUserLoading(false);
    }
  };

  const handleGroupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetGroupResult();

    const payload: ManualGroupRequest = {
      displayName: groupForm.displayName.trim()
    };

    if (groupForm.scimId.trim()) {
      payload.scimId = groupForm.scimId.trim();
    }

    const members = groupForm.memberText
      .split(/[\s,]+/u)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (members.length > 0) {
      payload.memberIds = members;
    }

    setGroupLoading(true);
    try {
      const resource = await createManualGroup(payload);
      setGroupResult(resource);
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : 'Failed to create group.');
    } finally {
      setGroupLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <div>
            <h2>Manual User Provisioning</h2>
            <p>Create SCIM users directly to reproduce collisions or test attribute handling. All fields are optional except the userName.</p>
          </div>
        </header>
        <form className={styles.form} onSubmit={handleUserSubmit}>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>userName*</span>
              <input
                type="text"
                value={userForm.userName}
                onChange={(event) => {
                  resetUserResult();
                  setUserForm((state) => ({ ...state, userName: event.target.value }));
                }}
                required
              />
            </label>
            <label className={styles.field}>
              <span>externalId</span>
              <input
                type="text"
                value={userForm.externalId}
                onChange={(event) => {
                  resetUserResult();
                  setUserForm((state) => ({ ...state, externalId: event.target.value }));
                }}
              />
            </label>
            <label className={styles.field}>
              <span>displayName</span>
              <input
                type="text"
                value={userForm.displayName}
                onChange={(event) => {
                  resetUserResult();
                  setUserForm((state) => ({ ...state, displayName: event.target.value }));
                }}
              />
            </label>
            <label className={styles.field}>
              <span>givenName</span>
              <input
                type="text"
                value={userForm.givenName}
                onChange={(event) => {
                  resetUserResult();
                  setUserForm((state) => ({ ...state, givenName: event.target.value }));
                }}
              />
            </label>
            <label className={styles.field}>
              <span>familyName</span>
              <input
                type="text"
                value={userForm.familyName}
                onChange={(event) => {
                  resetUserResult();
                  setUserForm((state) => ({ ...state, familyName: event.target.value }));
                }}
              />
            </label>
            <label className={styles.field}>
              <span>email</span>
              <input
                type="email"
                value={userForm.email}
                onChange={(event) => {
                  resetUserResult();
                  setUserForm((state) => ({ ...state, email: event.target.value }));
                }}
              />
            </label>
            <label className={styles.field}>
              <span>phoneNumber</span>
              <input
                type="text"
                value={userForm.phoneNumber}
                onChange={(event) => {
                  resetUserResult();
                  setUserForm((state) => ({ ...state, phoneNumber: event.target.value }));
                }}
              />
            </label>
            <label className={styles.field}>
              <span>department</span>
              <input
                type="text"
                value={userForm.department}
                onChange={(event) => {
                  resetUserResult();
                  setUserForm((state) => ({ ...state, department: event.target.value }));
                }}
              />
            </label>
          </div>
          <label className={styles.switchField}>
            <input
              type="checkbox"
              checked={userForm.active}
              onChange={(event) => {
                resetUserResult();
                setUserForm((state) => ({ ...state, active: event.target.checked }));
              }}
            />
            <span>Active</span>
          </label>
          <div className={styles.actions}>
            <button
              type="submit"
              disabled={userLoading || userForm.userName.trim().length === 0}
            >
              {userLoading ? 'Creating…' : 'Create User'}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setUserForm(initialUserState);
                resetUserResult();
              }}
              disabled={userLoading}
            >
              Reset
            </button>
          </div>
          {userError && <div className={styles.errorBox}>{userError}</div>}
          {userResult && (
            <div className={styles.resultBox}>
              <h3>User Created</h3>
              <dl>
                <div>
                  <dt>SCIM Id</dt>
                  <dd>{userResult.id}</dd>
                </div>
                <div>
                  <dt>userName</dt>
                  <dd>{userResult.userName}</dd>
                </div>
                {userResult.externalId && (
                  <div>
                    <dt>externalId</dt>
                    <dd>{userResult.externalId}</dd>
                  </div>
                )}
              </dl>
              <details>
                <summary>Show full payload</summary>
                <pre>{JSON.stringify(userResult, null, 2)}</pre>
              </details>
            </div>
          )}
        </form>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <div>
            <h2>Manual Group Provisioning</h2>
            <p>Create SCIM groups and optionally include member IDs to validate identifier collisions or membership behavior.</p>
          </div>
        </header>
        <form className={styles.form} onSubmit={handleGroupSubmit}>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>displayName*</span>
              <input
                type="text"
                value={groupForm.displayName}
                onChange={(event) => {
                  resetGroupResult();
                  setGroupForm((state) => ({ ...state, displayName: event.target.value }));
                }}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Custom SCIM Id (optional)</span>
              <input
                type="text"
                value={groupForm.scimId}
                onChange={(event) => {
                  resetGroupResult();
                  setGroupForm((state) => ({ ...state, scimId: event.target.value }));
                }}
              />
            </label>
          </div>
          <label className={styles.field}>
            <span>Member IDs (comma or newline separated)</span>
            <textarea
              rows={4}
              value={groupForm.memberText}
              onChange={(event) => {
                resetGroupResult();
                setGroupForm((state) => ({ ...state, memberText: event.target.value }));
              }}
              placeholder="7b39476c-4bb9-4d7a-baa8-5ad9cfe7e58e"
            />
          </label>
          <div className={styles.actions}>
            <button
              type="submit"
              disabled={groupLoading || groupForm.displayName.trim().length === 0}
            >
              {groupLoading ? 'Creating…' : 'Create Group'}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setGroupForm(initialGroupState);
                resetGroupResult();
              }}
              disabled={groupLoading}
            >
              Reset
            </button>
          </div>
          {groupError && <div className={styles.errorBox}>{groupError}</div>}
          {groupResult && (
            <div className={styles.resultBox}>
              <h3>Group Created</h3>
              <dl>
                <div>
                  <dt>SCIM Id</dt>
                  <dd>{groupResult.id}</dd>
                </div>
                <div>
                  <dt>displayName</dt>
                  <dd>{groupResult.displayName}</dd>
                </div>
              </dl>
              <details>
                <summary>Show full payload</summary>
                <pre>{JSON.stringify(groupResult, null, 2)}</pre>
              </details>
            </div>
          )}
        </form>
      </section>
    </div>
  );
};
