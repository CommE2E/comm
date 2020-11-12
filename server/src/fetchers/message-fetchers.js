// @flow

import type { PushInfo } from '../push/send';
import {
  type RawMessageInfo,
  messageTypes,
  type MessageType,
  assertMessageType,
  type ThreadSelectionCriteria,
  type MessageTruncationStatus,
  messageTruncationStatus,
  type FetchMessageInfosResult,
  type RawTextMessageInfo,
} from 'lib/types/message-types';
import { threadPermissions } from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import { notifCollapseKeyForRawMessageInfo } from 'lib/shared/notif-utils';
import {
  sortMessageInfoList,
  shimUnsupportedRawMessageInfos,
  createMediaMessageInfo,
} from 'lib/shared/message-utils';
import { permissionLookup } from 'lib/permissions/thread-permissions';
import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL, mergeOrConditions } from '../database/database';
import { creationString, localIDFromCreationString } from '../utils/idempotent';
import { mediaFromRow } from './upload-fetchers';

export type CollapsableNotifInfo = {|
  collapseKey: ?string,
  existingMessageInfos: RawMessageInfo[],
  newMessageInfos: RawMessageInfo[],
|};
export type FetchCollapsableNotifsResult = {
  [userID: string]: CollapsableNotifInfo[],
};

// This function doesn't filter RawMessageInfos based on what messageTypes the
// client supports, since each user can have multiple clients. The caller must
// handle this filtering.
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
          newMessageInfos: [rawMessageInfo],
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
    return usersToCollapsableNotifInfo;
  }

  const visPermissionExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const collapseQuery = SQL`
    SELECT m.id, m.thread AS threadID, m.content, m.time, m.type,
      m.user AS creatorID, stm.permissions AS subthread_permissions, n.user,
      n.collapse_key, up.id AS uploadID, up.type AS uploadType,
      up.secret AS uploadSecret, up.extra AS uploadExtra
    FROM notifications n
    LEFT JOIN messages m ON m.id = n.message
    LEFT JOIN uploads up
      ON m.type IN (${[messageTypes.IMAGES, messageTypes.MULTIMEDIA]})
        AND JSON_CONTAINS(m.content, CAST(up.id as JSON), '$')
    LEFT JOIN memberships mm ON mm.thread = m.thread AND mm.user = n.user
    LEFT JOIN memberships stm
      ON m.type = ${messageTypes.CREATE_SUB_THREAD}
        AND stm.thread = m.content AND stm.user = n.user
    WHERE n.rescinded = 0 AND
      JSON_EXTRACT(mm.permissions, ${visPermissionExtractString}) IS TRUE AND
  `;
  collapseQuery.append(mergeOrConditions(sqlTuples));
  collapseQuery.append(SQL`ORDER BY m.time DESC`);
  const [collapseResult] = await dbQuery(collapseQuery);

  const rowsByUser = new Map();
  for (const row of collapseResult) {
    const user = row.user.toString();
    const currentRowsForUser = rowsByUser.get(user);
    if (currentRowsForUser) {
      currentRowsForUser.push(row);
    } else {
      rowsByUser.set(user, [row]);
    }
  }

  for (const userRows of rowsByUser.values()) {
    const messages = parseMessageSQLResult(userRows);
    for (const message of messages) {
      const { rawMessageInfo, rows } = message;
      const [row] = rows;
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

  return usersToCollapsableNotifInfo;
}

type MessageSQLResult = $ReadOnlyArray<{|
  rawMessageInfo: RawMessageInfo,
  rows: $ReadOnlyArray<Object>,
|}>;
function parseMessageSQLResult(
  rows: $ReadOnlyArray<Object>,
  viewer?: Viewer,
): MessageSQLResult {
  const rowsByID = new Map();
  for (let row of rows) {
    const id = row.id.toString();
    const currentRowsForID = rowsByID.get(id);
    if (currentRowsForID) {
      currentRowsForID.push(row);
    } else {
      rowsByID.set(id, [row]);
    }
  }

  const messages = [];
  for (let messageRows of rowsByID.values()) {
    const rawMessageInfo = rawMessageInfoFromRows(messageRows, viewer);
    if (rawMessageInfo) {
      messages.push({ rawMessageInfo, rows: messageRows });
    }
  }

  return messages;
}

function assertSingleRow(rows: $ReadOnlyArray<Object>): Object {
  if (rows.length === 0) {
    throw new Error('expected single row, but none present!');
  } else if (rows.length !== 1) {
    const messageIDs = rows.map((row) => row.id.toString());
    console.warn(
      `expected single row, but there are multiple! ${messageIDs.join(', ')}`,
    );
  }
  return rows[0];
}

function mostRecentRowType(rows: $ReadOnlyArray<Object>): MessageType {
  if (rows.length === 0) {
    throw new Error('expected row, but none present!');
  }
  return assertMessageType(rows[0].type);
}

function rawMessageInfoFromRows(
  rows: $ReadOnlyArray<Object>,
  viewer?: ?Viewer,
): ?RawMessageInfo {
  const type = mostRecentRowType(rows);
  if (type === messageTypes.TEXT) {
    const row = assertSingleRow(rows);
    const rawTextMessageInfo: RawTextMessageInfo = {
      type: messageTypes.TEXT,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      text: row.content,
    };
    const localID = localIDFromCreationString(viewer, row.creation);
    if (localID) {
      rawTextMessageInfo.localID = localID;
    }
    return rawTextMessageInfo;
  } else if (type === messageTypes.CREATE_THREAD) {
    const row = assertSingleRow(rows);
    return {
      type: messageTypes.CREATE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      initialThreadState: JSON.parse(row.content),
    };
  } else if (type === messageTypes.ADD_MEMBERS) {
    const row = assertSingleRow(rows);
    return {
      type: messageTypes.ADD_MEMBERS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      addedUserIDs: JSON.parse(row.content),
    };
  } else if (type === messageTypes.CREATE_SUB_THREAD) {
    const row = assertSingleRow(rows);
    const subthreadPermissions = row.subthread_permissions;
    if (!permissionLookup(subthreadPermissions, threadPermissions.KNOW_OF)) {
      return null;
    }
    return {
      type: messageTypes.CREATE_SUB_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      childThreadID: row.content,
    };
  } else if (type === messageTypes.CHANGE_SETTINGS) {
    const row = assertSingleRow(rows);
    const content = JSON.parse(row.content);
    const field = Object.keys(content)[0];
    return {
      type: messageTypes.CHANGE_SETTINGS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      field,
      value: content[field],
    };
  } else if (type === messageTypes.REMOVE_MEMBERS) {
    const row = assertSingleRow(rows);
    return {
      type: messageTypes.REMOVE_MEMBERS,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      removedUserIDs: JSON.parse(row.content),
    };
  } else if (type === messageTypes.CHANGE_ROLE) {
    const row = assertSingleRow(rows);
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.CHANGE_ROLE,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      userIDs: content.userIDs,
      newRole: content.newRole,
    };
  } else if (type === messageTypes.LEAVE_THREAD) {
    const row = assertSingleRow(rows);
    return {
      type: messageTypes.LEAVE_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  } else if (type === messageTypes.JOIN_THREAD) {
    const row = assertSingleRow(rows);
    return {
      type: messageTypes.JOIN_THREAD,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
    };
  } else if (type === messageTypes.CREATE_ENTRY) {
    const row = assertSingleRow(rows);
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.CREATE_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  } else if (type === messageTypes.EDIT_ENTRY) {
    const row = assertSingleRow(rows);
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.EDIT_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  } else if (type === messageTypes.DELETE_ENTRY) {
    const row = assertSingleRow(rows);
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.DELETE_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  } else if (type === messageTypes.RESTORE_ENTRY) {
    const row = assertSingleRow(rows);
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.RESTORE_ENTRY,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      entryID: content.entryID,
      date: content.date,
      text: content.text,
    };
  } else if (type === messageTypes.IMAGES || type === messageTypes.MULTIMEDIA) {
    const media = rows.filter((row) => row.uploadID).map(mediaFromRow);
    const [row] = rows;
    return createMediaMessageInfo({
      threadID: row.threadID.toString(),
      creatorID: row.creatorID.toString(),
      media,
      id: row.id.toString(),
      localID: localIDFromCreationString(viewer, row.creation),
      time: row.time,
    });
  } else if (type === messageTypes.UPDATE_RELATIONSHIP) {
    const row = assertSingleRow(rows);
    const content = JSON.parse(row.content);
    return {
      type: messageTypes.UPDATE_RELATIONSHIP,
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      time: row.time,
      creatorID: row.creatorID.toString(),
      targetID: content.targetID,
      operation: content.operation,
    };
  } else {
    invariant(false, `unrecognized messageType ${type}`);
  }
}

const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;

async function fetchMessageInfos(
  viewer: Viewer,
  criteria: ThreadSelectionCriteria,
  numberPerThread: number,
): Promise<FetchMessageInfosResult> {
  const threadSelectionClause = threadSelectionCriteriaToSQLClause(criteria);
  const truncationStatuses = {};

  const viewerID = viewer.id;
  const query = SQL`
    SELECT * FROM (
      SELECT x.id, x.content, x.time, x.type, x.user AS creatorID,
        x.creation, x.subthread_permissions, x.uploadID, x.uploadType,
        x.uploadSecret, x.uploadExtra,
        @num := if(
          @thread = x.thread,
          if(@message = x.id, @num, @num + 1),
          1
        ) AS number,
        @message := x.id AS messageID,
        @thread := x.thread AS threadID
      FROM (SELECT @num := 0, @thread := '', @message := '') init
      JOIN (
        SELECT m.id, m.thread, m.user, m.content, m.time, m.type,
          m.creation, stm.permissions AS subthread_permissions,
          up.id AS uploadID, up.type AS uploadType, up.secret AS uploadSecret,
          up.extra AS uploadExtra
        FROM messages m
        LEFT JOIN uploads up
          ON m.type IN (${[messageTypes.IMAGES, messageTypes.MULTIMEDIA]})
            AND JSON_CONTAINS(m.content, CAST(up.id as JSON), '$')
        LEFT JOIN memberships mm
          ON mm.thread = m.thread AND mm.user = ${viewerID}
        LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
          AND stm.thread = m.content AND stm.user = ${viewerID}
        WHERE JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE AND
  `;
  query.append(threadSelectionClause);
  query.append(SQL`
        ORDER BY m.thread, m.time DESC
      ) x
    ) y
    WHERE y.number <= ${numberPerThread}
  `);
  const [result] = await dbQuery(query);

  const messages = parseMessageSQLResult(result, viewer);

  const rawMessageInfos = [];
  const threadToMessageCount = new Map();
  for (let message of messages) {
    const { rawMessageInfo } = message;
    rawMessageInfos.push(rawMessageInfo);
    const { threadID } = rawMessageInfo;
    const currentCountValue = threadToMessageCount.get(threadID);
    const currentCount = currentCountValue ? currentCountValue : 0;
    threadToMessageCount.set(threadID, currentCount + 1);
  }

  for (let [threadID, messageCount] of threadToMessageCount) {
    // If there are fewer messages returned than the max for a given thread,
    // then our result set includes all messages in the query range for that
    // thread
    truncationStatuses[threadID] =
      messageCount < numberPerThread
        ? messageTruncationStatus.EXHAUSTIVE
        : messageTruncationStatus.TRUNCATED;
  }

  for (let rawMessageInfo of rawMessageInfos) {
    if (rawMessageInfo.type === messageTypes.CREATE_THREAD) {
      // If a CREATE_THREAD message for a given thread is in the result set,
      // then our result set includes all messages in the query range for that
      // thread
      truncationStatuses[rawMessageInfo.threadID] =
        messageTruncationStatus.EXHAUSTIVE;
    }
  }

  for (let threadID in criteria.threadCursors) {
    const truncationStatus = truncationStatuses[threadID];
    if (truncationStatus === null || truncationStatus === undefined) {
      // If nothing was returned for a thread that was explicitly queried for,
      // then our result set includes all messages in the query range for that
      // thread
      truncationStatuses[threadID] = messageTruncationStatus.EXHAUSTIVE;
    } else if (truncationStatus === messageTruncationStatus.TRUNCATED) {
      // If a cursor was specified for a given thread, then the result is
      // guaranteed to be contiguous with what the client has, and as such the
      // result should never be TRUNCATED
      truncationStatuses[threadID] = messageTruncationStatus.UNCHANGED;
    }
  }

  const shimmedRawMessageInfos = shimUnsupportedRawMessageInfos(
    rawMessageInfos,
    viewer.platformDetails,
  );

  return {
    rawMessageInfos: shimmedRawMessageInfos,
    truncationStatuses,
  };
}

function threadSelectionCriteriaToSQLClause(criteria: ThreadSelectionCriteria) {
  const conditions = [];
  if (criteria.joinedThreads === true) {
    conditions.push(SQL`mm.role > 0`);
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

async function fetchMessageInfosSince(
  viewer: Viewer,
  criteria: ThreadSelectionCriteria,
  currentAsOf: number,
  maxNumberPerThread: number,
): Promise<FetchMessageInfosResult> {
  const threadSelectionClause = threadSelectionCriteriaToSQLClause(criteria);
  const truncationStatuses = threadSelectionCriteriaToInitialTruncationStatuses(
    criteria,
    messageTruncationStatus.UNCHANGED,
  );

  const viewerID = viewer.id;
  const query = SQL`
    SELECT m.id, m.thread AS threadID, m.content, m.time, m.type,
      m.creation, m.user AS creatorID, stm.permissions AS subthread_permissions,
      up.id AS uploadID, up.type AS uploadType, up.secret AS uploadSecret,
      up.extra AS uploadExtra
    FROM messages m
    LEFT JOIN uploads up
      ON m.type IN (${[messageTypes.IMAGES, messageTypes.MULTIMEDIA]})
        AND JSON_CONTAINS(m.content, CAST(up.id as JSON), '$')
    LEFT JOIN memberships mm ON mm.thread = m.thread AND mm.user = ${viewerID}
    LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
      AND stm.thread = m.content AND stm.user = ${viewerID}
    WHERE m.time > ${currentAsOf} AND
      JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE AND
  `;
  query.append(threadSelectionClause);
  query.append(SQL`
    ORDER BY m.thread, m.time DESC
  `);
  const [result] = await dbQuery(query);

  const messages = parseMessageSQLResult(result, viewer);

  const rawMessageInfos = [];
  let currentThreadID = null;
  let numMessagesForCurrentThreadID = 0;
  for (let message of messages) {
    const { rawMessageInfo } = message;
    const { threadID } = rawMessageInfo;
    if (threadID !== currentThreadID) {
      currentThreadID = threadID;
      numMessagesForCurrentThreadID = 1;
      truncationStatuses[threadID] = messageTruncationStatus.UNCHANGED;
    } else {
      numMessagesForCurrentThreadID++;
    }
    if (numMessagesForCurrentThreadID <= maxNumberPerThread) {
      if (rawMessageInfo.type === messageTypes.CREATE_THREAD) {
        // If a CREATE_THREAD message is here, then we have all messages
        truncationStatuses[threadID] = messageTruncationStatus.EXHAUSTIVE;
      }
      rawMessageInfos.push(rawMessageInfo);
    } else if (numMessagesForCurrentThreadID === maxNumberPerThread + 1) {
      truncationStatuses[threadID] = messageTruncationStatus.TRUNCATED;
    }
  }

  const shimmedRawMessageInfos = shimUnsupportedRawMessageInfos(
    rawMessageInfos,
    viewer.platformDetails,
  );

  return {
    rawMessageInfos: shimmedRawMessageInfos,
    truncationStatuses,
  };
}

function getMessageFetchResultFromRedisMessages(
  viewer: Viewer,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
): FetchMessageInfosResult {
  const truncationStatuses = {};
  for (let rawMessageInfo of rawMessageInfos) {
    truncationStatuses[rawMessageInfo.threadID] =
      messageTruncationStatus.UNCHANGED;
  }
  const shimmedRawMessageInfos = shimUnsupportedRawMessageInfos(
    rawMessageInfos,
    viewer.platformDetails,
  );
  return {
    rawMessageInfos: shimmedRawMessageInfos,
    truncationStatuses,
  };
}

async function fetchMessageInfoForLocalID(
  viewer: Viewer,
  localID: ?string,
): Promise<?RawMessageInfo> {
  if (!localID || !viewer.hasSessionInfo) {
    return null;
  }
  const creation = creationString(viewer, localID);
  const viewerID = viewer.id;
  const query = SQL`
    SELECT m.id, m.thread AS threadID, m.content, m.time, m.type, m.creation,
      m.user AS creatorID, stm.permissions AS subthread_permissions,
      up.id AS uploadID, up.type AS uploadType, up.secret AS uploadSecret,
      up.extra AS uploadExtra
    FROM messages m
    LEFT JOIN uploads up
      ON m.type IN (${[messageTypes.IMAGES, messageTypes.MULTIMEDIA]})
        AND JSON_CONTAINS(m.content, CAST(up.id as JSON), '$')
    LEFT JOIN memberships mm ON mm.thread = m.thread AND mm.user = ${viewerID}
    LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
      AND stm.thread = m.content AND stm.user = ${viewerID}
    WHERE m.user = ${viewerID} AND m.creation = ${creation} AND
      JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE
  `;

  const [result] = await dbQuery(query);
  if (result.length === 0) {
    return null;
  }
  return rawMessageInfoFromRows(result, viewer);
}

const entryIDExtractString = '$.entryID';
async function fetchMessageInfoForEntryAction(
  viewer: Viewer,
  messageType: MessageType,
  entryID: string,
  threadID: string,
): Promise<?RawMessageInfo> {
  const viewerID = viewer.id;
  const query = SQL`
    SELECT m.id, m.thread AS threadID, m.content, m.time, m.type, m.creation,
      m.user AS creatorID, up.id AS uploadID, up.type AS uploadType,
      up.secret AS uploadSecret, up.extra AS uploadExtra
    FROM messages m
    LEFT JOIN uploads up
      ON m.type IN (${[messageTypes.IMAGES, messageTypes.MULTIMEDIA]})
        AND JSON_CONTAINS(m.content, CAST(up.id as JSON), '$')
    LEFT JOIN memberships mm ON mm.thread = m.thread AND mm.user = ${viewerID}
    WHERE m.user = ${viewerID} AND m.thread = ${threadID} AND
      m.type = ${messageType} AND
      JSON_EXTRACT(m.content, ${entryIDExtractString}) = ${entryID} AND
      JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE
  `;

  const [result] = await dbQuery(query);
  if (result.length === 0) {
    return null;
  }
  return rawMessageInfoFromRows(result, viewer);
}

export {
  fetchCollapsableNotifs,
  fetchMessageInfos,
  fetchMessageInfosSince,
  getMessageFetchResultFromRedisMessages,
  fetchMessageInfoForLocalID,
  fetchMessageInfoForEntryAction,
};
