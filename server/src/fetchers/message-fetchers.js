// @flow

import type { PushInfo } from '../push/send';
import type { UserInfos } from 'lib/types/user-types';
import {
  type RawMessageInfo,
  messageType,
  assertMessageType,
  type ThreadSelectionCriteria,
  type MessageTruncationStatus,
  messageTruncationStatus,
  type MessageTruncationStatuses,
  type FetchMessageInfosResult,
} from 'lib/types/message-types';
import {
  assertThreadType,
  threadPermissions,
  threadTypes,
} from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import { notifCollapseKeyForRawMessageInfo } from 'lib/shared/notif-utils';
import { sortMessageInfoList } from 'lib/shared/message-utils';
import { permissionHelper } from 'lib/permissions/thread-permissions';
import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL, mergeOrConditions } from '../database';
import { fetchUserInfos } from './user-fetchers';

export type CollapsableNotifInfo = {|
  collapseKey: ?string,
  existingMessageInfos: RawMessageInfo[],
  newMessageInfos: RawMessageInfo[],
|};
export type FetchCollapsableNotifsResult = {|
  usersToCollapsableNotifInfo: { [userID: string]: CollapsableNotifInfo[] },
  userInfos: UserInfos,
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
      st.type AS subthread_type,
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
        OR t.type = ${threadTypes.OPEN}
      )
      AND n.rescinded = 0
      AND
  `;
  collapseQuery.append(mergeOrConditions(sqlTuples));
  collapseQuery.append(SQL`ORDER BY m.time DESC`);
  const [ collapseResult ] = await dbQuery(collapseQuery);

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
      threadType: assertThreadType(row.subthread_type),
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

async function fetchMessageInfos(
  viewer: Viewer,
  criteria: ThreadSelectionCriteria,
  numberPerThread: number,
): Promise<FetchMessageInfosResult> {
  const threadSelectionClause = threadSelectionCriteriaToSQLClause(criteria);
  const truncationStatuses = threadSelectionCriteriaToInitialTruncationStatuses(
    criteria,
    messageTruncationStatus.EXHAUSTIVE,
  );

  const viewerID = viewer.id;
  const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const query = SQL`
    SELECT * FROM (
      SELECT x.id, x.content, x.time, x.type, x.user AS creatorID,
        u.username AS creator, x.subthread_permissions, x.subthread_type,
        @num := if(@thread = x.thread, @num + 1, 1) AS number,
        @thread := x.thread AS threadID
      FROM (SELECT @num := 0, @thread := '') init
      JOIN (
        SELECT m.id, m.thread, m.user, m.content, m.time, m.type,
          stm.permissions AS subthread_permissions,
          st.type AS subthread_type
        FROM messages m
        LEFT JOIN threads t ON t.id = m.thread
        LEFT JOIN memberships mm
          ON mm.thread = m.thread AND mm.user = ${viewerID}
        LEFT JOIN threads st
          ON m.type = ${messageType.CREATE_SUB_THREAD} AND st.id = m.content
        LEFT JOIN memberships stm ON m.type = ${messageType.CREATE_SUB_THREAD}
          AND stm.thread = m.content AND stm.user = ${viewerID}
        WHERE
          (
            JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE
            OR t.type = ${threadTypes.OPEN}
          )
          AND
  `;
  query.append(threadSelectionClause);
  query.append(SQL`
        ORDER BY m.thread, m.time DESC
      ) x
      LEFT JOIN users u ON u.id = x.user
    ) y
    WHERE y.number <= ${numberPerThread}
  `);
  const [ result ] = await dbQuery(query);

  const rawMessageInfos = [];
  const userInfos = {};
  const threadToMessageCount = new Map();
  for (let row of result) {
    const creatorID = row.creatorID.toString();
    userInfos[creatorID] = {
      id: creatorID,
      username: row.creator,
    };
    const rawMessageInfo = rawMessageInfoFromRow(row);
    if (rawMessageInfo) {
      rawMessageInfos.push(rawMessageInfo);
    }
    const threadID = row.threadID.toString();
    const currentCountValue = threadToMessageCount.get(threadID);
    const currentCount = currentCountValue ? currentCountValue : 0;
    threadToMessageCount.set(threadID, currentCount + 1);
  }

  for (let [ threadID, messageCount ] of threadToMessageCount) {
    truncationStatuses[threadID] = messageCount < numberPerThread
      ? messageTruncationStatus.EXHAUSTIVE
      : messageTruncationStatus.TRUNCATED;
  }

  const allUserInfos = await fetchAllUsers(rawMessageInfos, userInfos);

  return {
    rawMessageInfos,
    truncationStatuses,
    userInfos: allUserInfos,
  };
}

function threadSelectionCriteriaToSQLClause(criteria: ThreadSelectionCriteria) {
  const conditions = [];
  if (criteria.joinedThreads === true) {
    conditions.push(SQL`mm.role != 0`);
  }
  if (criteria.threadCursors) {
    for (let threadID in criteria.threadCursors) {
      const cursor = criteria.threadCursors[threadID];
      if (cursor) {
        conditions.push(SQL`(m.thread = ${threadID} AND m.id < ${cursor})`);
      } else {
        conditions.push(SQL`m.thread = ${threadID}`);
      }
    }
  }
  if (conditions.length === 0) {
    throw new ServerError('internal_error');
  }
  return mergeOrConditions(conditions);
}

function threadSelectionCriteriaToInitialTruncationStatuses(
  criteria: ThreadSelectionCriteria,
  defaultTruncationStatus: MessageTruncationStatus,
) {
  const truncationStatuses = {};
  if (criteria.threadCursors) {
    for (let threadID in criteria.threadCursors) {
      truncationStatuses[threadID] = defaultTruncationStatus;
    }
  }
  return truncationStatuses;
}

async function fetchAllUsers(
  rawMessageInfos: RawMessageInfo[],
  userInfos: UserInfos,
): Promise<UserInfos> {
  const allAddedUserIDs = [];
  for (let rawMessageInfo of rawMessageInfos) {
    let newUsers = [];
    if (rawMessageInfo.type === messageType.ADD_MEMBERS) {
      newUsers = rawMessageInfo.addedUserIDs;
    } else if (rawMessageInfo.type === messageType.CREATE_THREAD) {
      newUsers = rawMessageInfo.initialThreadState.memberIDs;
    }
    for (let userID of newUsers) {
      if (!userInfos[userID]) {
        allAddedUserIDs.push(userID);
      }
    }
  }
  if (allAddedUserIDs.length === 0) {
    return userInfos;
  }

  const newUserInfos = await fetchUserInfos(allAddedUserIDs);
  return {
    ...userInfos,
    ...newUserInfos,
  };
}

async function fetchMessageInfosSince(
  viewer: Viewer,
  criteria: ThreadSelectionCriteria,
  currentAsOf: number,
  maxNumberPerThread: number,
): Promise<FetchMessageInfosResult> {
  const threadSelectionClause = threadSelectionCriteriaToSQLClause(criteria);
  const truncationStatuses = threadSelectionCriteriaToInitialTruncationStatuses(
    criteria,
    messageTruncationStatus.EXHAUSTIVE,
  );

  const viewerID = viewer.id;
  const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const query = SQL`
    SELECT m.id, m.thread AS threadID, m.content, m.time, m.type,
      u.username AS creator, m.user AS creatorID,
      stm.permissions AS subthread_permissions, st.type AS subthread_type
    FROM messages m
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN memberships mm ON mm.thread = m.thread AND mm.user = ${viewerID}
    LEFT JOIN threads st
      ON m.type = ${messageType.CREATE_SUB_THREAD} AND st.id = m.content
    LEFT JOIN memberships stm ON m.type = ${messageType.CREATE_SUB_THREAD}
      AND stm.thread = m.content AND stm.user = ${viewerID}
    LEFT JOIN users u ON u.id = m.user
    WHERE
      (
        JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE
        OR t.type = ${threadTypes.OPEN}
      )
      AND m.time > ${currentAsOf}
      AND
  `;
  query.append(threadSelectionClause);
  query.append(SQL`
    ORDER BY m.thread, m.time DESC
  `);
  const [ result ] = await dbQuery(query);

  const rawMessageInfos = [];
  const userInfos = {};
  let currentThreadID = null;
  let numMessagesForCurrentThreadID = 0;
  for (let row of result) {
    const threadID = row.threadID.toString();
    if (threadID !== currentThreadID) {
      currentThreadID = threadID;
      numMessagesForCurrentThreadID = 1;
      truncationStatuses[threadID] = messageTruncationStatus.UNCHANGED;
    } else {
      numMessagesForCurrentThreadID++;
    }
    if (numMessagesForCurrentThreadID <= maxNumberPerThread) {
      if (row.type === messageType.CREATE_THREAD) {
        // If a CREATE_THREAD message is here, then we have all messages
        truncationStatuses[threadID] = messageTruncationStatus.EXHAUSTIVE;
      }
      const creatorID = row.creatorID.toString();
      userInfos[creatorID] = {
        id: creatorID,
        username: row.creator,
      };
      const rawMessageInfo = rawMessageInfoFromRow(row);
      if (rawMessageInfo) {
        rawMessageInfos.push(rawMessageInfo);
      }
    } else if (numMessagesForCurrentThreadID === maxNumberPerThread + 1) {
      truncationStatuses[threadID] = messageTruncationStatus.TRUNCATED;
    }
  }

  const allUserInfos = await fetchAllUsers(rawMessageInfos, userInfos);

  return {
    rawMessageInfos,
    truncationStatuses,
    userInfos: allUserInfos,
  };
}

export {
  fetchCollapsableNotifs,
  fetchMessageInfos,
  fetchMessageInfosSince,
};
