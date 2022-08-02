// @flow

import invariant from 'invariant';

import {
  sortMessageInfoList,
  shimUnsupportedRawMessageInfos,
} from 'lib/shared/message-utils';
import { messageSpecs } from 'lib/shared/messages/message-specs';
import { notifCollapseKeyForRawMessageInfo } from 'lib/shared/notif-utils';
import { hasMinCodeVersion } from 'lib/shared/version-utils';
import {
  type RawMessageInfo,
  type RawComposableMessageInfo,
  type RawRobotextMessageInfo,
  messageTypes,
  type MessageType,
  assertMessageType,
  type MessageSelectionCriteria,
  type MessageTruncationStatus,
  messageTruncationStatus,
  type FetchMessageInfosResult,
  defaultMaxMessageAge,
} from 'lib/types/message-types';
import { threadPermissions } from 'lib/types/thread-types';
import { ServerError } from 'lib/utils/errors';

import {
  dbQuery,
  SQL,
  mergeOrConditions,
  mergeAndConditions,
} from '../database/database';
import { getDBType } from '../database/db-config';
import type { SQLStatementType } from '../database/types';
import type { PushInfo } from '../push/send';
import type { Viewer } from '../session/viewer';
import { creationString, localIDFromCreationString } from '../utils/idempotent';
import { mediaFromRow } from './upload-fetchers';

export type CollapsableNotifInfo = {
  collapseKey: ?string,
  existingMessageInfos: RawMessageInfo[],
  newMessageInfos: RawMessageInfo[],
};
export type FetchCollapsableNotifsResult = {
  [userID: string]: CollapsableNotifInfo[],
};

const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;

// This function doesn't filter RawMessageInfos based on what messageTypes the
// client supports, since each user can have multiple clients. The caller must
// handle this filtering.
async function fetchCollapsableNotifs(
  pushInfo: PushInfo,
): Promise<FetchCollapsableNotifsResult> {
  // First, we need to fetch any notifications that should be collapsed
  const usersToCollapseKeysToInfo = {};
  const usersToCollapsableNotifInfo = {};
  for (const userID in pushInfo) {
    usersToCollapseKeysToInfo[userID] = {};
    usersToCollapsableNotifInfo[userID] = [];
    for (const rawMessageInfo of pushInfo[userID].messageInfos) {
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
  for (const userID in usersToCollapseKeysToInfo) {
    const collapseKeysToInfo = usersToCollapseKeysToInfo[userID];
    for (const collapseKey in collapseKeysToInfo) {
      sqlTuples.push(
        SQL`(n.user = ${userID} AND n.collapse_key = ${collapseKey})`,
      );
    }
  }

  if (sqlTuples.length === 0) {
    return usersToCollapsableNotifInfo;
  }

  const collapseQuery = SQL`
    SELECT m.id, m.thread AS threadID, m.content, m.time, m.type,
      m.user AS creatorID, stm.permissions AS subthread_permissions, n.user,
      n.collapse_key, up.id AS uploadID, up.type AS uploadType,
      up.secret AS uploadSecret, up.extra AS uploadExtra
    FROM notifications n
    LEFT JOIN messages m ON m.id = n.message
    LEFT JOIN uploads up ON up.container = m.id
    LEFT JOIN memberships mm ON mm.thread = m.thread AND mm.user = n.user
    LEFT JOIN memberships stm
      ON m.type = ${messageTypes.CREATE_SUB_THREAD}
        AND stm.thread = m.content AND stm.user = n.user
    WHERE n.rescinded = 0 AND
      JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE AND
  `;
  collapseQuery.append(mergeOrConditions(sqlTuples));
  collapseQuery.append(SQL`ORDER BY m.time DESC, m.id DESC`);
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

  const derivedMessages = await fetchDerivedMessages(collapseResult);

  const parsePromises = [...rowsByUser.values()].map(userRows =>
    parseMessageSQLResult(userRows, derivedMessages),
  );
  const parsedMessages = await Promise.all(parsePromises);

  for (const messages of parsedMessages) {
    for (const message of messages) {
      const { rawMessageInfo, rows } = message;
      const [row] = rows;
      const info = usersToCollapseKeysToInfo[row.user][row.collapse_key];
      info.existingMessageInfos.push(rawMessageInfo);
    }
  }

  for (const userID in usersToCollapseKeysToInfo) {
    const collapseKeysToInfo = usersToCollapseKeysToInfo[userID];
    for (const collapseKey in collapseKeysToInfo) {
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

type MessageSQLResult = $ReadOnlyArray<{
  rawMessageInfo: RawMessageInfo,
  rows: $ReadOnlyArray<Object>,
}>;
async function parseMessageSQLResult(
  rows: $ReadOnlyArray<Object>,
  derivedMessages: $ReadOnlyMap<
    string,
    RawComposableMessageInfo | RawRobotextMessageInfo,
  >,
  viewer?: Viewer,
): Promise<MessageSQLResult> {
  const rowsByID = new Map();
  for (const row of rows) {
    const id = row.id.toString();
    const currentRowsForID = rowsByID.get(id);
    if (currentRowsForID) {
      currentRowsForID.push(row);
    } else {
      rowsByID.set(id, [row]);
    }
  }

  const messagePromises = [...rowsByID.values()].map(async messageRows => {
    const rawMessageInfo = await rawMessageInfoFromRows(
      messageRows,
      viewer,
      derivedMessages,
    );
    return rawMessageInfo ? { rawMessageInfo, rows: messageRows } : null;
  });
  const messages = await Promise.all(messagePromises);
  return messages.filter(Boolean);
}

function assertSingleRow(rows: $ReadOnlyArray<Object>): Object {
  if (rows.length === 0) {
    throw new Error('expected single row, but none present!');
  } else if (rows.length !== 1) {
    const messageIDs = rows.map(row => row.id.toString());
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

async function rawMessageInfoFromRows(
  rawRows: $ReadOnlyArray<Object>,
  viewer?: Viewer,
  derivedMessages: $ReadOnlyMap<
    string,
    RawComposableMessageInfo | RawRobotextMessageInfo,
  >,
): Promise<?RawMessageInfo> {
  let rows = rawRows;
  const dbType = await getDBType();
  if (dbType !== 'mysql5.7') {
    rows = rawRows.map(row => ({
      ...row,
      subthread_permissions: JSON.parse(row.subthread_permissions),
    }));
  }

  const type = mostRecentRowType(rows);
  const messageSpec = messageSpecs[type];

  if (type === messageTypes.IMAGES || type === messageTypes.MULTIMEDIA) {
    const media = await Promise.all(
      rows.filter(row => row.uploadID).map(mediaFromRow),
    );
    const [row] = rows;
    const localID = localIDFromCreationString(viewer, row.creation);
    invariant(
      messageSpec.rawMessageInfoFromServerDBRow,
      `multimedia message spec should have rawMessageInfoFromServerDBRow`,
    );
    return messageSpec.rawMessageInfoFromServerDBRow(row, {
      media,
      derivedMessages,
      localID,
    });
  }

  const row = assertSingleRow(rows);
  const localID = localIDFromCreationString(viewer, row.creation);
  invariant(
    messageSpec.rawMessageInfoFromServerDBRow,
    `message spec ${type} should have rawMessageInfoFromServerDBRow`,
  );
  return messageSpec.rawMessageInfoFromServerDBRow(row, {
    derivedMessages,
    localID,
  });
}

async function fetchMessageInfos(
  viewer: Viewer,
  criteria: MessageSelectionCriteria,
  numberPerThread: number,
): Promise<FetchMessageInfosResult> {
  const {
    sqlClause: selectionClause,
    timeFilterData,
  } = parseMessageSelectionCriteria(viewer, criteria);
  const truncationStatuses = {};

  const viewerID = viewer.id;
  const dbType = await getDBType();

  let query;
  if (dbType === 'mysql5.7') {
    query = SQL`
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
          LEFT JOIN uploads up ON up.container = m.id
          LEFT JOIN memberships mm
            ON mm.thread = m.thread AND mm.user = ${viewerID}
          LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
            AND stm.thread = m.content AND stm.user = ${viewerID}
          WHERE JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE AND
    `;
    query.append(selectionClause);
    // - We specify a ridiculously high LIMIT here to force MariaDB to maintain
    //   the ORDER BY. Otherwise the query optimizer will assume that the order
    //   doesn't matter because the outer query doesn't have an ORDER BY.
    // - Setting an ORDER BY on the outer query won't work because our quirky
    //   counting logic in the SELECT would be executed before the ORDER, on the
    //   unsorted results from the inner query.
    // - More details available here:
    //   https://mariadb.com/kb/en/why-is-order-by-in-a-from-subquery-ignored/
    query.append(SQL`
          ORDER BY m.thread, m.time DESC, m.id DESC
          LIMIT 18446744073709551615
        ) x
      ) y
      WHERE y.number <= ${numberPerThread}
    `);
  } else {
    query = SQL`
      WITH thread_window AS (
        SELECT m.id, m.thread AS threadID, m.user AS creatorID, m.content,
          m.time, m.type, m.creation, stm.permissions AS subthread_permissions,
          up.id AS uploadID, up.type AS uploadType, up.secret AS uploadSecret,
          up.extra AS uploadExtra,
          ROW_NUMBER() OVER (
            PARTITION BY threadID ORDER BY m.time DESC, m.id DESC
          ) n
        FROM messages m
        LEFT JOIN uploads up ON up.container = m.id
        LEFT JOIN memberships mm
          ON mm.thread = m.thread AND mm.user = ${viewerID}
        LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
          AND stm.thread = m.content AND stm.user = ${viewerID}
        WHERE JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE AND
    `;
    query.append(selectionClause);
    query.append(SQL`
      )
      SELECT * FROM thread_window WHERE n <= ${numberPerThread};
    `);
  }

  const [result] = await dbQuery(query);
  const derivedMessages = await fetchDerivedMessages(result, viewer);
  const messages = await parseMessageSQLResult(result, derivedMessages, viewer);

  const rawMessageInfos = [];
  const threadToMessageCount = new Map();
  for (const message of messages) {
    const { rawMessageInfo } = message;
    rawMessageInfos.push(rawMessageInfo);
    const { threadID } = rawMessageInfo;
    const currentCountValue = threadToMessageCount.get(threadID);
    const currentCount = currentCountValue ? currentCountValue : 0;
    threadToMessageCount.set(threadID, currentCount + 1);
  }

  for (const [threadID, messageCount] of threadToMessageCount) {
    // If we matched the exact amount we limited to, we're probably truncating
    // our result set. By setting TRUNCATED here, we tell the client that the
    // result set might not be continguous with what's already in their
    // MessageStore. More details about TRUNCATED can be found in
    // lib/types/message-types.js
    if (messageCount >= numberPerThread) {
      // We won't set TRUNCATED if a cursor was specified for a given thread,
      // since then the result is guaranteed to be contiguous with what the
      // client has
      if (criteria.threadCursors && criteria.threadCursors[threadID]) {
        truncationStatuses[threadID] = messageTruncationStatus.UNCHANGED;
      } else {
        truncationStatuses[threadID] = messageTruncationStatus.TRUNCATED;
      }
      continue;
    }
    const hasTimeFilter = hasTimeFilterForThread(timeFilterData, threadID);
    if (!hasTimeFilter) {
      // If there is no time filter for a given thread, and there are fewer
      // messages returned than the max we queried for a given thread, we can
      // conclude that our result set includes all messages for that thread
      truncationStatuses[threadID] = messageTruncationStatus.EXHAUSTIVE;
    }
  }

  for (const rawMessageInfo of rawMessageInfos) {
    if (messageSpecs[rawMessageInfo.type].startsThread) {
      truncationStatuses[rawMessageInfo.threadID] =
        messageTruncationStatus.EXHAUSTIVE;
    }
  }

  for (const threadID in criteria.threadCursors) {
    const truncationStatus = truncationStatuses[threadID];
    if (truncationStatus !== null && truncationStatus !== undefined) {
      continue;
    }
    const hasTimeFilter = hasTimeFilterForThread(timeFilterData, threadID);
    if (!hasTimeFilter) {
      // If there is no time filter for a given thread, and zero messages were
      // returned, we can conclude that this thread has zero messages. This is
      // a case of database corruption that should not be possible, but likely
      // we have some threads like this on prod (either due to some transient
      // issues or due to old buggy code)
      truncationStatuses[threadID] = messageTruncationStatus.EXHAUSTIVE;
    } else {
      // If this thread was explicitly queried for, and we got no results, but
      // we can't conclude that it's EXHAUSTIVE, then we'll set to UNCHANGED.
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

function hasTimeFilterForThread(
  timeFilterData: TimeFilterData,
  threadID: string,
) {
  if (timeFilterData.timeFilter === 'ALL') {
    return true;
  } else if (timeFilterData.timeFilter === 'NONE') {
    return false;
  } else if (timeFilterData.timeFilter === 'ALL_EXCEPT_EXCLUDED') {
    return !timeFilterData.excludedFromTimeFilter.has(threadID);
  } else {
    invariant(
      false,
      `unrecognized timeFilter type ${timeFilterData.timeFilter}`,
    );
  }
}

type TimeFilterData =
  | { +timeFilter: 'ALL' | 'NONE' }
  | {
      +timeFilter: 'ALL_EXCEPT_EXCLUDED',
      +excludedFromTimeFilter: $ReadOnlySet<string>,
    };
type ParsedMessageSelectionCriteria = {
  +sqlClause: SQLStatementType,
  +timeFilterData: TimeFilterData,
};
function parseMessageSelectionCriteria(
  viewer: Viewer,
  criteria: MessageSelectionCriteria,
): ParsedMessageSelectionCriteria {
  const minMessageTime = Date.now() - defaultMaxMessageAge;
  const shouldApplyTimeFilter = hasMinCodeVersion(viewer.platformDetails, 130);

  let globalTimeFilter;
  if (criteria.newerThan) {
    globalTimeFilter = SQL`m.time > ${criteria.newerThan}`;
  } else if (!criteria.threadCursors && shouldApplyTimeFilter) {
    globalTimeFilter = SQL`m.time > ${minMessageTime}`;
  }

  const threadConditions = [];
  if (
    criteria.joinedThreads === true &&
    shouldApplyTimeFilter &&
    !globalTimeFilter
  ) {
    threadConditions.push(SQL`(mm.role > 0 AND m.time > ${minMessageTime})`);
  } else if (criteria.joinedThreads === true) {
    threadConditions.push(SQL`mm.role > 0`);
  }
  if (criteria.threadCursors) {
    for (const threadID in criteria.threadCursors) {
      const cursor = criteria.threadCursors[threadID];
      if (cursor) {
        threadConditions.push(
          SQL`(m.thread = ${threadID} AND m.id < ${cursor})`,
        );
      } else {
        threadConditions.push(SQL`m.thread = ${threadID}`);
      }
    }
  }
  if (threadConditions.length === 0) {
    throw new ServerError('internal_error');
  }
  const threadClause = mergeOrConditions(threadConditions);

  let timeFilterData;
  if (globalTimeFilter) {
    timeFilterData = { timeFilter: 'ALL' };
  } else if (!shouldApplyTimeFilter) {
    timeFilterData = { timeFilter: 'NONE' };
  } else {
    invariant(
      criteria.threadCursors,
      'ALL_EXCEPT_EXCLUDED should correspond to threadCursors being set',
    );
    const excludedFromTimeFilter = new Set(Object.keys(criteria.threadCursors));
    timeFilterData = {
      timeFilter: 'ALL_EXCEPT_EXCLUDED',
      excludedFromTimeFilter,
    };
  }

  const conditions = [globalTimeFilter, threadClause].filter(Boolean);
  const sqlClause = mergeAndConditions(conditions);

  return { sqlClause, timeFilterData };
}

function messageSelectionCriteriaToInitialTruncationStatuses(
  criteria: MessageSelectionCriteria,
  defaultTruncationStatus: MessageTruncationStatus,
) {
  const truncationStatuses = {};
  if (criteria.threadCursors) {
    for (const threadID in criteria.threadCursors) {
      truncationStatuses[threadID] = defaultTruncationStatus;
    }
  }
  return truncationStatuses;
}

async function fetchMessageInfosSince(
  viewer: Viewer,
  criteria: MessageSelectionCriteria,
  maxNumberPerThread: number,
): Promise<FetchMessageInfosResult> {
  const { sqlClause: selectionClause } = parseMessageSelectionCriteria(
    viewer,
    criteria,
  );
  const truncationStatuses = messageSelectionCriteriaToInitialTruncationStatuses(
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
    LEFT JOIN uploads up ON up.container = m.id
    LEFT JOIN memberships mm ON mm.thread = m.thread AND mm.user = ${viewerID}
    LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
      AND stm.thread = m.content AND stm.user = ${viewerID}
    WHERE JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE AND
  `;
  query.append(selectionClause);
  query.append(SQL`
    ORDER BY m.thread, m.time DESC, m.id DESC
  `);
  const [result] = await dbQuery(query);
  const derivedMessages = await fetchDerivedMessages(result, viewer);
  const messages = await parseMessageSQLResult(result, derivedMessages, viewer);

  const rawMessageInfos = [];
  let currentThreadID = null;
  let numMessagesForCurrentThreadID = 0;
  for (const message of messages) {
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
      if (messageSpecs[rawMessageInfo.type].startsThread) {
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
  for (const rawMessageInfo of rawMessageInfos) {
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
    LEFT JOIN uploads up ON up.container = m.id
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
  const derivedMessages = await fetchDerivedMessages(result, viewer);
  return await rawMessageInfoFromRows(result, viewer, derivedMessages);
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
    LEFT JOIN uploads up ON up.container = m.id
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
  const derivedMessages = await fetchDerivedMessages(result, viewer);
  return await rawMessageInfoFromRows(result, viewer, derivedMessages);
}

async function fetchMessageRowsByIDs(messageIDs: $ReadOnlyArray<string>) {
  const query = SQL`
    SELECT m.id, m.thread AS threadID, m.content, m.time, m.type, m.creation, 
      m.user AS creatorID, stm.permissions AS subthread_permissions,
      up.id AS uploadID, up.type AS uploadType, up.secret AS uploadSecret, 
      up.extra AS uploadExtra
    FROM messages m
    LEFT JOIN uploads up ON up.container = m.id
    LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
      AND stm.thread = m.content AND stm.user = m.user
    WHERE m.id IN (${messageIDs})
  `;
  const [result] = await dbQuery(query);
  return result;
}

async function fetchDerivedMessages(
  rows: $ReadOnlyArray<Object>,
  viewer?: Viewer,
): Promise<
  $ReadOnlyMap<string, RawComposableMessageInfo | RawRobotextMessageInfo>,
> {
  const requiredIDs = new Set<string>();
  for (const row of rows) {
    if (row.type === messageTypes.SIDEBAR_SOURCE) {
      const content = JSON.parse(row.content);
      requiredIDs.add(content.sourceMessageID);
    }
  }

  const messagesByID = new Map<
    string,
    RawComposableMessageInfo | RawRobotextMessageInfo,
  >();
  if (requiredIDs.size === 0) {
    return messagesByID;
  }

  const result = await fetchMessageRowsByIDs([...requiredIDs]);
  const messages = await parseMessageSQLResult(result, new Map(), viewer);

  for (const message of messages) {
    const { rawMessageInfo } = message;
    if (rawMessageInfo.id) {
      invariant(
        rawMessageInfo.type !== messageTypes.SIDEBAR_SOURCE,
        'SIDEBAR_SOURCE should not point to a SIDEBAR_SOURCE',
      );
      messagesByID.set(rawMessageInfo.id, rawMessageInfo);
    }
  }
  return messagesByID;
}

async function fetchMessageInfoByID(
  viewer?: Viewer,
  messageID: string,
): Promise<?RawMessageInfo> {
  const result = await fetchMessageRowsByIDs([messageID]);
  if (result.length === 0) {
    return null;
  }
  const derivedMessages = await fetchDerivedMessages(result, viewer);
  return await rawMessageInfoFromRows(result, viewer, derivedMessages);
}

export {
  fetchCollapsableNotifs,
  fetchMessageInfos,
  fetchMessageInfosSince,
  getMessageFetchResultFromRedisMessages,
  fetchMessageInfoForLocalID,
  fetchMessageInfoForEntryAction,
  fetchMessageInfoByID,
};
