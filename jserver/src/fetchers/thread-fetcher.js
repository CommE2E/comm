// @flow

import type { Connection } from '../database';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { UserInfo } from 'lib/types/user-types';

import {
  assertVisibilityRules,
  assertEditRules,
  threadPermissions,
} from 'lib/types/thread-types';

import { SQL } from '../database';
import { getViewerID } from '../session';
import {
  permissionLookup,
  getAllThreadPermissions,
} from '../permissions/permissions';

const SQLStatement = SQL.SQLStatement;

type FetchThreadInfosResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: {[id: string]: UserInfo},
|};

async function fetchThreadInfos(
  conn: Connection,
  condition?: SQLStatement,
  skipVisibilityChecks: bool,
): Promise<FetchThreadInfosResult> {
  const whereClause = condition ? SQL`WHERE `.append(condition) : "";

  const query = SQL`
    SELECT t.id, t.name, t.parent_thread_id, t.color, t.description,
      t.edit_rules, t.visibility_rules, t.creation_time, t.default_role,
      r.id AS role, r.name AS role_name, r.permissions AS role_permissions,
      m.user, m.permissions, m.subscribed, m.unread, u.username
    FROM threads t
    LEFT JOIN (
        SELECT thread, id, name, permissions
          FROM roles
        UNION SELECT id AS thread, 0 AS id, NULL AS name, NULL AS permissions
          FROM threads
      ) r ON r.thread = t.id
    LEFT JOIN memberships m ON m.role = r.id AND m.thread = t.id
    LEFT JOIN users u ON u.id = m.user
  `.append(whereClause).append(SQL`ORDER BY m.user ASC`);
  const [ result ] = await conn.query(query);

  const viewerID = getViewerID();
  const threadInfos = {};
  const userInfos = {};
  for (let row of result) {
    const threadID = row.id;
    if (!threadInfos[threadID]) {
      threadInfos[threadID] = {
        id: threadID,
        name: row.name,
        description: row.description,
        visibilityRules: row.visibility_rules,
        color: row.color,
        editRules: row.edit_rules,
        creationTime: row.creation_time,
        parentThreadID: row.parent_thread_id,
        members: [],
        roles: {},
        currentUser: null,
      };
    }
    if (row.role && !threadInfos[threadID].roles[row.role]) {
      threadInfos[threadID].roles[row.role] = {
        id: row.role,
        name: row.role_name,
        permissions: row.role_permissions,
        isDefault: row.role === row.default_role,
      };
    }
    if (row.user) {
      const userID = row.user;
      const allPermissions = getAllThreadPermissions(
        {
          permissions: row.permissions,
          visibilityRules: assertVisibilityRules(row.visibility_rules),
          editRules: assertEditRules(row.edit_rules),
        },
        threadID,
      );
      // This is a hack, similar to what we have in ThreadSettingsUser.
      // Basically we only want to return users that are either a member of this
      // thread, or are a "parent admin". We approximate "parent admin" by
      // looking for the PERMISSION_CHANGE_ROLE permission.
      if (row.role || allPermissions[threadPermissions.CHANGE_ROLE].value) {
        const member = {
          id: userID,
          permissions: allPermissions,
          role: row.role ? row.role : null,
        };
        threadInfos[threadID].members.push(member);
        if (userID === viewerID) {
          threadInfos[threadID].currentUser = {
            permissions: member.permissions,
            role: member.role,
            subscribed: !!row.subscribed,
            unread: member.role ? row.unread : null,
          };
        }
      }
      if (row.username) {
        userInfos[userID] = {
          id: userID,
          username: row.username,
        };
      }
    }
  }

  const finalThreadInfos = {};
  for (let threadID in threadInfos) {
    let threadInfo = threadInfos[threadID];
    let allPermissions;
    if (!threadInfo.currentUser) {
      allPermissions = getAllThreadPermissions(
        {
          permissions: null,
          visibilityRules: threadInfo.visibilityRules,
          editRules: threadInfo.editRules,
        },
        threadID,
      );
      threadInfo = {
        ...threadInfo,
        currentUser: {
          permissions: allPermissions,
          role: null,
          subscribed: false,
        },
      };
    } else {
      allPermissions = threadInfo.currentUser.permissions;
    }
    if (
      skipVisibilityChecks ||
      permissionLookup(allPermissions, threadPermissions.KNOW_OF)
    ) {
      finalThreadInfos[threadID] = threadInfo;
    }
  }

  return {
    threadInfos: finalThreadInfos,
    userInfos,
  };
}

export {
  fetchThreadInfos,
};
