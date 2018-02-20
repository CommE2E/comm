// @flow

import type { PushInfo } from '../push/send';
import type { UserInfo } from 'lib/types/user-types';
import {
  type RawMessageInfo,
  messageType,
  assertMessageType,
} from 'lib/types/message-types';

import invariant from 'invariant';

import { notifCollapseKeyForRawMessageInfo } from 'lib/shared/notif-utils';
import {
  assertVisibilityRules,
  threadPermissions,
  visibilityRules,
} from 'lib/types/thread-types';
import { sortMessageInfoList } from 'lib/shared/message-utils';
import { permissionHelper } from 'lib/permissions/thread-permissions';

import { pool, SQL, mergeOrConditions } from '../database';

export type CollapsableNotifInfo = {|
  collapseKey: ?string,
  existingMessageInfos: RawMessageInfo[],
  newMessageInfos: RawMessageInfo[],
|};
export type FetchCollapsableNotifsResult = {|
  usersToCollapsableNotifInfo: { [userID: string]: CollapsableNotifInfo[] },
  userInfos: { [id: string]: UserInfo },
|};

async function fetchCollapsableNotifs(
  pushInfo: PushInfo,
): Promise<FetchCollapsableNotifsResult> {
  // First, we need to fetch any notifications that should be collapsed
  const usersToCollapseKeysToInfo = {};
  const usersToCollapsableNotifInfo = {};
  for (let userID in pushInfo) {
    usersToCollapseKeysToInfo[userID] = {};
    usersToCollapsableNotifInfo[userID] = [];
    for (let rawMessageInfo of pushInfo[userID].messageInfos) {
      const collapseKey = notifCollapseKeyForRawMessageInfo(rawMessageInfo);
      if (!collapseKey) {
        const collapsableNotifInfo = {
          collapseKey,
          existingMessageInfos: [],
          newMessageInfos: [ rawMessageInfo ],
        };
        usersToCollapsableNotifInfo[userID].push(collapsableNotifInfo);
        continue;
      }
      if (!usersToCollapseKeysToInfo[userID][collapseKey]) {
        usersToCollapseKeysToInfo[userID][collapseKey] = {
          collapseKey,
          existingMessageInfos: [],
          newMessageInfos: [],
        };
      }
      usersToCollapseKeysToInfo[userID][collapseKey].newMessageInfos.push(
        rawMessageInfo,
      );
    }
  }

  const sqlTuples = [];
  for (let userID in usersToCollapseKeysToInfo) {
    const collapseKeysToInfo = usersToCollapseKeysToInfo[userID];
    for (let collapseKey in collapseKeysToInfo) {
      sqlTuples.push(
        SQL`(n.user = ${userID} AND n.collapse_key = ${collapseKey})`,
      );
    }
  }

  if (sqlTuples.length === 0) {
    return { usersToCollapsableNotifInfo, userInfos: {} };
  }

  const visPermissionExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const collapseQuery = SQL`
    SELECT m.id, m.thread AS threadID, m.content, m.time, m.type,
      u.username AS creator, m.user AS creatorID,
      stm.permissions AS subthread_permissions,
      st.visibility_rules AS subthread_visibility_rules,
      n.user, n.collapse_key
    FROM notifications n
    LEFT JOIN messages m ON m.id = n.message
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN memberships mm ON mm.thread = m.thread AND mm.user = n.user
    LEFT JOIN threads st
      ON m.type = ${messageType.CREATE_SUB_THREAD} AND st.id = m.content
    LEFT JOIN memberships stm
      ON m.type = ${messageType.CREATE_SUB_THREAD}
        AND stm.thread = m.content AND stm.user = n.user
    LEFT JOIN users u ON u.id = m.user
    WHERE
      (
        JSON_EXTRACT(mm.permissions, ${visPermissionExtractString}) IS TRUE
        OR t.visibility_rules = ${visibilityRules.OPEN}
      )
      AND n.rescinded = 0
      AND
  `;
  collapseQuery.append(mergeOrConditions(sqlTuples));
  collapseQuery.append(SQL`ORDER BY m.time DESC`);
  const [ collapseResult ] = await pool.query(collapseQuery);

  const userInfos = {};
  for (let row of collapseResult) {
    userInfos[row.creatorID] = { id: row.creatorID, username: row.creator };
    const rawMessageInfo = rawMessageInfoFromRow(row);
    if (rawMessageInfo) {
      const info = usersToCollapseKeysToInfo[row.user][row.collapse_key];
      info.existingMessageInfos.push(rawMessageInfo);
    }
  }

  for (let userID in usersToCollapseKeysToInfo) {
    const collapseKeysToInfo = usersToCollapseKeysToInfo[userID];
    for (let collapseKey in collapseKeysToInfo) {
      const info = collapseKeysToInfo[collapseKey];
      usersToCollapsableNotifInfo[userID].push({
        collapseKey: info.collapseKey,
        existingMessageInfos: sortMessageInfoList(info.existingMessageInfos),
        newMessageInfos: sortMessageInfoList(info.newMessageInfos),
      });
    }
  }

  return { usersToCollapsableNotifInfo, userInfos };
}

function rawMessageInfoFromRow(row: Object): ?RawMessageInfo {
  const type = assertMessageType(row.type);
  if (type === messageType.TEXT) {
    return {
      type: messageType.TEXT,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      text: row.content,
    };
  } else if (type === messageType.CREATE_THREAD) {
    return {
      type: messageType.CREATE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      initialThreadState: JSON.parse(row.content),
    };
  } else if (type === messageType.ADD_MEMBERS) {
    return {
      type: messageType.ADD_MEMBERS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      addedUserIDs: JSON.parse(row.content),
    };
  } else if (type === messageType.CREATE_SUB_THREAD) {
    const subthreadPermissionInfo = {
      permissions: row.subthread_permissions,
      visibilityRules: assertVisibilityRules(row.subthread_visibility_rules),
    };
    if (!permissionHelper(subthreadPermissionInfo, threadPermissions.KNOW_OF)) {
      return null;
    }
    return {
      type: messageType.CREATE_SUB_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      childThreadID: row.content,
    };
  } else if (type === messageType.CHANGE_SETTINGS) {
    const content = JSON.parse(row.content);
    const field = Object.keys(content)[0];
    return {
      type: messageType.CHANGE_SETTINGS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      field,
      value: content[field],
    };
  } else if (type === messageType.REMOVE_MEMBERS) {
    return {
      type: messageType.REMOVE_MEMBERS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      removedUserIDs: JSON.parse(row.content),
    };
  } else if (type === messageType.CHANGE_ROLE) {
    const content = JSON.parse(row.content);
    return {
      type: messageType.CHANGE_ROLE,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      userIDs: content.userIDs,
      newRole: content.newRole,
    };
  } else if (type === messageType.LEAVE_THREAD) {
    return {
      type: messageType.LEAVE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  } else if (type === messageType.JOIN_THREAD) {
    return {
      type: messageType.JOIN_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  } else if (type === messageType.CREATE_ENTRY) {
    const content = JSON.parse(row.content);
    return {
      type: messageType.CREATE_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  } else if (type === messageType.EDIT_ENTRY) {
    const content = JSON.parse(row.content);
    return {
      type: messageType.EDIT_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  } else if (type === messageType.DELETE_ENTRY) {
    const content = JSON.parse(row.content);
    return {
      type: messageType.DELETE_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  } else if (type === messageType.RESTORE_ENTRY) {
    const content = JSON.parse(row.content);
    return {
      type: messageType.RESTORE_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  } else {
    invariant(false, `unrecognized messageType ${type}`);
  }
}

export {
  fetchCollapsableNotifs,
};
