// @flow

import invariant from 'invariant';
import _difference from 'lodash/fp/difference.js';
import _max from 'lodash/fp/max.js';

import { localIDPrefix } from 'lib/shared/message-utils.js';
import type {
  UpdateActivityResult,
  UpdateActivityRequest,
  SetThreadUnreadStatusRequest,
  SetThreadUnreadStatusResult,
} from 'lib/types/activity-types.js';
import { messageTypes } from 'lib/types/message-types.js';
import { threadPermissions } from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL, mergeOrConditions } from '../database/database.js';
import type { SQLStatementType } from '../database/types.js';
import { deleteActivityForViewerSession } from '../deleters/activity-deleters.js';
import {
  checkThread,
  getValidThreads,
} from '../fetchers/thread-permission-fetchers.js';
import { rescindPushNotifs } from '../push/rescind.js';
import { updateBadgeCount } from '../push/send.js';
import type { Viewer } from '../session/viewer.js';
import { earliestFocusedTimeConsideredExpired } from '../shared/focused-times.js';

type PartialThreadStatus = {
  +focusActive: boolean,
  +threadID: string,
  +newLastReadMessage: ?number,
};
type ThreadStatus =
  | {
      +focusActive: true,
      +threadID: string,
      +newLastReadMessage: number,
      +curLastReadMessage: number,
      +rescindCondition: SQLStatementType,
    }
  | {
      +focusActive: false,
      +threadID: string,
      +newLastReadMessage: ?number,
      +curLastReadMessage: number,
      +rescindCondition: ?SQLStatementType,
      +newerMessageFromOtherAuthor: boolean,
    };
async function activityUpdater(
  viewer: Viewer,
  request: UpdateActivityRequest,
): Promise<UpdateActivityResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const focusUpdatesByThreadID = new Map();
  for (const activityUpdate of request.updates) {
    const threadID = activityUpdate.threadID;
    const updatesForThreadID = focusUpdatesByThreadID.get(threadID) ?? [];
    if (!focusUpdatesByThreadID.has(threadID)) {
      focusUpdatesByThreadID.set(threadID, updatesForThreadID);
    }
    updatesForThreadID.push(activityUpdate);
  }

  const unverifiedThreadIDs: $ReadOnlySet<string> = new Set(
    request.updates.map(update => update.threadID),
  );

  const verifiedThreadsData = await getValidThreads(
    viewer,
    [...unverifiedThreadIDs],
    [
      {
        check: 'permission',
        permission: threadPermissions.VISIBLE,
      },
    ],
  );

  if (verifiedThreadsData.length === 0) {
    return { unfocusedToUnread: [] };
  }

  const memberThreadIDs = new Set();
  const verifiedThreadIDs = [];
  for (const threadData of verifiedThreadsData) {
    if (threadData.role > 0) {
      memberThreadIDs.add(threadData.threadID);
    }
    verifiedThreadIDs.push(threadData.threadID);
  }

  const partialThreadStatuses: PartialThreadStatus[] = [];
  for (const threadID of verifiedThreadIDs) {
    const focusUpdates = focusUpdatesByThreadID.get(threadID);
    invariant(focusUpdates, `no focusUpdate for thread ID ${threadID}`);
    const focusActive = !focusUpdates.some(update => !update.focus);

    const newLastReadMessage = _max(
      focusUpdates
        .filter(
          update =>
            update.latestMessage &&
            !update.latestMessage.startsWith(localIDPrefix),
        )
        .map(update => parseInt(update.latestMessage)),
    );

    partialThreadStatuses.push({
      threadID,
      focusActive,
      newLastReadMessage,
    });
  }

  // We update the focused rows before we check for new messages so we can
  // guarantee that any messages that may have set the thread to unread before
  // we set it to focused are caught and overriden
  await updateFocusedRows(viewer, partialThreadStatuses);

  if (memberThreadIDs.size === 0) {
    return { unfocusedToUnread: [] };
  }

  const memberPartialThreadStatuses = partialThreadStatuses.filter(
    partialStatus => memberThreadIDs.has(partialStatus.threadID),
  );
  const unfocusedLatestMessages = new Map<string, number>();
  for (const partialThreadStatus of memberPartialThreadStatuses) {
    const { threadID, focusActive, newLastReadMessage } = partialThreadStatus;
    if (!focusActive) {
      unfocusedLatestMessages.set(threadID, newLastReadMessage ?? 0);
    }
  }
  const [unfocusedThreadsWithNewerMessages, lastMessageInfos] =
    await Promise.all([
      checkForNewerMessages(viewer, unfocusedLatestMessages),
      fetchLastMessageInfo(viewer, [...memberThreadIDs]),
    ]);

  const threadStatuses: ThreadStatus[] = [];
  for (const partialThreadStatus of memberPartialThreadStatuses) {
    const { threadID, focusActive, newLastReadMessage } = partialThreadStatus;

    const lastMessageInfo = lastMessageInfos.get(threadID);
    invariant(
      lastMessageInfo !== undefined,
      `no lastMessageInfo for thread ID ${threadID}`,
    );
    const { lastMessage, lastReadMessage: curLastReadMessage } =
      lastMessageInfo;

    if (focusActive) {
      threadStatuses.push({
        focusActive: true,
        threadID,
        newLastReadMessage: newLastReadMessage
          ? Math.max(lastMessage, newLastReadMessage)
          : lastMessage,
        curLastReadMessage,
        rescindCondition: SQL`n.thread = ${threadID}`,
      });
    } else {
      threadStatuses.push({
        focusActive: false,
        threadID,
        newLastReadMessage,
        curLastReadMessage,
        rescindCondition: newLastReadMessage
          ? SQL`(n.thread = ${threadID} AND n.message <= ${newLastReadMessage})`
          : null,
        newerMessageFromOtherAuthor:
          unfocusedThreadsWithNewerMessages.has(threadID),
      });
    }
  }

  // The following block determines whether to enqueue updates for a given
  // (user, thread) pair and whether to propagate badge count notifs to all of
  // that user's devices
  const setUnread: Array<{ +threadID: string, +unread: boolean }> = [];
  for (const threadStatus of threadStatuses) {
    const { threadID, curLastReadMessage } = threadStatus;
    if (!threadStatus.focusActive) {
      const { newLastReadMessage, newerMessageFromOtherAuthor } = threadStatus;
      if (newerMessageFromOtherAuthor) {
        setUnread.push({ threadID, unread: true });
      } else if (!newLastReadMessage) {
        // This is a rare edge case. It should only be possible for threads that
        // have zero messages on both the client and server, which shouldn't
        // happen. In this case we'll set the thread to read, just in case...
        console.warn(`thread ID ${threadID} appears to have no messages`);
        setUnread.push({ threadID, unread: false });
      } else if (newLastReadMessage > curLastReadMessage) {
        setUnread.push({ threadID, unread: false });
      }
    } else {
      const { newLastReadMessage } = threadStatus;
      if (newLastReadMessage > curLastReadMessage) {
        setUnread.push({ threadID, unread: false });
      }
    }
  }

  const time = Date.now();
  const updateDatas = setUnread.map(({ threadID, unread }) => ({
    type: updateTypes.UPDATE_THREAD_READ_STATUS,
    userID: viewer.userID,
    time,
    threadID,
    unread,
  }));

  const latestMessages = new Map<string, number>();
  for (const threadStatus of threadStatuses) {
    const { threadID, newLastReadMessage, curLastReadMessage } = threadStatus;
    if (newLastReadMessage && newLastReadMessage > curLastReadMessage) {
      latestMessages.set(threadID, newLastReadMessage);
    }
  }
  await Promise.all([
    updateLastReadMessage(viewer, latestMessages),
    createUpdates(updateDatas, { viewer, updatesForCurrentSession: 'ignore' }),
  ]);

  // We do this afterwards so the badge count is correct
  const rescindConditions = threadStatuses
    .map(({ rescindCondition }) => rescindCondition)
    .filter(Boolean);
  let rescindCondition;
  if (rescindConditions.length > 0) {
    rescindCondition = SQL`n.user = ${viewer.userID} AND `;
    rescindCondition.append(mergeOrConditions(rescindConditions));
  }
  await rescindAndUpdateBadgeCounts(
    viewer,
    rescindCondition,
    updateDatas.length > 0 ? 'activity_update' : null,
  );

  return { unfocusedToUnread: [...unfocusedThreadsWithNewerMessages] };
}

async function updateFocusedRows(
  viewer: Viewer,
  partialThreadStatuses: $ReadOnlyArray<PartialThreadStatus>,
): Promise<void> {
  const threadIDs = partialThreadStatuses
    .filter(threadStatus => threadStatus.focusActive)
    .map(({ threadID }) => threadID);
  const time = Date.now();

  if (threadIDs.length > 0) {
    const focusedInsertRows = threadIDs.map(threadID => [
      viewer.userID,
      viewer.session,
      threadID,
      time,
    ]);
    const query = SQL`
      INSERT INTO focused (user, session, thread, time)
      VALUES ${focusedInsertRows}
      ON DUPLICATE KEY UPDATE time = VALUE(time)
    `;
    await dbQuery(query);
  }

  if (viewer.hasSessionInfo) {
    await deleteActivityForViewerSession(viewer, time);
  }
}

// To protect against a possible race condition, we reset the thread to unread
// if the latest message ID on the client at the time that focus was dropped
// is no longer the latest message ID.
// Returns the set of unfocused threads that should be set to unread on
// the client because a new message arrived since they were unfocused.
async function checkForNewerMessages(
  viewer: Viewer,
  latestMessages: Map<string, number>,
): Promise<Set<string>> {
  if (latestMessages.size === 0 || !viewer.loggedIn) {
    return new Set();
  }

  const unfocusedThreadIDs = [...latestMessages.keys()];
  const focusedElsewhereThreadIDs = await checkThreadsFocused(
    viewer,
    unfocusedThreadIDs,
  );
  const unreadCandidates = _difference(unfocusedThreadIDs)(
    focusedElsewhereThreadIDs,
  );
  if (unreadCandidates.length === 0) {
    return new Set();
  }

  const knowOfExtractString = `$.${threadPermissions.KNOW_OF}.value`;
  const query = SQL`
    SELECT m.thread, MAX(m.id) AS latest_message
    FROM messages m
    LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
      AND stm.thread = m.content AND stm.user = ${viewer.userID}
    WHERE m.thread IN (${unreadCandidates}) AND
      m.user != ${viewer.userID} AND
      (
        m.type != ${messageTypes.CREATE_SUB_THREAD} OR
        JSON_EXTRACT(stm.permissions, ${knowOfExtractString}) IS TRUE
      )
    GROUP BY m.thread
  `;
  const [result] = await dbQuery(query);

  const threadsWithNewerMessages = new Set();
  for (const row of result) {
    const threadID = row.thread.toString();
    const serverLatestMessage = row.latest_message;
    const clientLatestMessage = latestMessages.get(threadID);
    if (clientLatestMessage < serverLatestMessage) {
      threadsWithNewerMessages.add(threadID);
    }
  }
  return threadsWithNewerMessages;
}

async function checkThreadsFocused(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
): Promise<string[]> {
  const time = earliestFocusedTimeConsideredExpired();
  const query = SQL`
    SELECT thread
    FROM focused
    WHERE time > ${time}
      AND user = ${viewer.userID}
      AND thread IN (${threadIDs})
    GROUP BY thread
  `;
  const [result] = await dbQuery(query);

  const focusedThreadIDs = [];
  for (const row of result) {
    focusedThreadIDs.push(row.thread.toString());
  }
  return focusedThreadIDs;
}

async function updateLastReadMessage(
  viewer: Viewer,
  lastReadMessages: $ReadOnlyMap<string, number>,
) {
  if (lastReadMessages.size === 0) {
    return;
  }

  const query = SQL`
    UPDATE memberships
    SET last_read_message = GREATEST(last_read_message, 
      CASE 
  `;
  lastReadMessages.forEach((lastMessage, threadID) => {
    query.append(SQL`
        WHEN thread = ${threadID} THEN ${lastMessage} `);
  });
  query.append(SQL`
        ELSE last_read_message
      END)
    WHERE thread IN (${[...lastReadMessages.keys()]}) 
      AND user = ${viewer.userID}
  `);

  await dbQuery(query);
}

async function setThreadUnreadStatus(
  viewer: Viewer,
  request: SetThreadUnreadStatusRequest,
): Promise<SetThreadUnreadStatusResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const isMemberAndCanViewThread = await checkThread(viewer, request.threadID, [
    {
      check: 'is_member',
    },
    {
      check: 'permission',
      permission: threadPermissions.VISIBLE,
    },
  ]);
  if (!isMemberAndCanViewThread) {
    throw new ServerError('invalid_parameters');
  }

  const resetThreadToUnread = await shouldResetThreadToUnread(viewer, request);
  if (!resetThreadToUnread) {
    const lastReadMessage = request.unread
      ? SQL`0`
      : SQL`GREATEST(m.last_read_message, ${request.latestMessage ?? 0})`;
    const update = SQL`
      UPDATE memberships m
      SET m.last_read_message =
    `;
    update.append(lastReadMessage);
    update.append(SQL`
      WHERE m.thread = ${request.threadID} AND m.user = ${viewer.userID}
    `);
    const queryPromise = dbQuery(update);

    const time = Date.now();
    const updatesPromise = createUpdates(
      [
        {
          type: updateTypes.UPDATE_THREAD_READ_STATUS,
          userID: viewer.userID,
          time: time,
          threadID: request.threadID,
          unread: request.unread,
        },
      ],
      { viewer, updatesForCurrentSession: 'ignore' },
    );

    await Promise.all([updatesPromise, queryPromise]);
  }

  let rescindCondition;
  if (!request.unread) {
    rescindCondition = SQL`
      n.user = ${viewer.userID} AND
      n.thread = ${request.threadID} AND
      n.message <= ${request.latestMessage}
    `;
  }
  await rescindAndUpdateBadgeCounts(
    viewer,
    rescindCondition,
    request.unread ? 'mark_as_unread' : 'mark_as_read',
  );

  return {
    resetToUnread: resetThreadToUnread,
  };
}

async function rescindAndUpdateBadgeCounts(
  viewer: Viewer,
  rescindCondition: ?SQLStatementType,
  badgeCountUpdateSource: ?(
    | 'activity_update'
    | 'mark_as_unread'
    | 'mark_as_read'
  ),
) {
  const notificationPromises = [];
  if (rescindCondition) {
    notificationPromises.push(rescindPushNotifs(rescindCondition));
  }
  if (badgeCountUpdateSource) {
    notificationPromises.push(updateBadgeCount(viewer, badgeCountUpdateSource));
  }
  await Promise.all(notificationPromises);
}

async function shouldResetThreadToUnread(
  viewer: Viewer,
  request: SetThreadUnreadStatusRequest,
): Promise<boolean> {
  if (request.unread) {
    return false;
  }

  const threadsWithNewerMessages = await checkForNewerMessages(
    viewer,
    new Map([[request.threadID, parseInt(request.latestMessage) || 0]]),
  );

  return threadsWithNewerMessages.has(request.threadID);
}

type LastMessageInfo = {
  +lastMessage: number,
  +lastReadMessage: number,
};
async function fetchLastMessageInfo(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
) {
  const query = SQL`
    SELECT thread, last_message, last_read_message
    FROM memberships
    WHERE user = ${viewer.userID} AND thread IN (${threadIDs})
  `;
  const [result] = await dbQuery(query);

  const lastMessages = new Map<string, LastMessageInfo>();
  for (const row of result) {
    const threadID = row.thread.toString();
    const lastMessage = row.last_message;
    const lastReadMessage = row.last_read_message;
    lastMessages.set(threadID, { lastMessage, lastReadMessage });
  }
  return lastMessages;
}

export { activityUpdater, setThreadUnreadStatus };
