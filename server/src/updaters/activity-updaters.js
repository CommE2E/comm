// @flow

import type { Viewer } from '../session/viewer';
import type {
  UpdateActivityResult,
  UpdateActivityRequest,
  SetThreadUnreadStatusRequest,
  SetThreadUnreadStatusResult,
} from 'lib/types/activity-types';
import { messageTypes } from 'lib/types/message-types';
import { threadPermissions } from 'lib/types/thread-types';
import { updateTypes } from 'lib/types/update-types';

import invariant from 'invariant';
import _difference from 'lodash/fp/difference';
import _max from 'lodash/fp/max';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL, mergeOrConditions } from '../database/database';
import { rescindPushNotifs } from '../push/rescind';
import { updateBadgeCount } from '../push/send';
import { createUpdates } from '../creators/update-creator';
import { deleteActivityForViewerSession } from '../deleters/activity-deleters';
import { earliestFocusedTimeConsideredCurrent } from '../shared/focused-times';
import {
  checkThread,
  checkThreads,
} from '../fetchers/thread-permission-fetchers';

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
    request.updates.map((update) => update.threadID),
  );
  const viewerMemberThreads = await checkThreads(
    viewer,
    [...unverifiedThreadIDs],
    [
      {
        check: 'is_member',
      },
      {
        check: 'permission',
        permission: threadPermissions.VISIBLE,
      },
    ],
  );

  if (viewerMemberThreads.size === 0) {
    return { unfocusedToUnread: [] };
  }

  const currentlyFocused = [];
  const unfocusedLatestMessages = new Map<string, number>();
  const latestMessages = new Map<string, number>();
  const rescindConditions = [];
  for (const threadID of viewerMemberThreads) {
    const focusUpdates = focusUpdatesByThreadID.get(threadID);
    invariant(focusUpdates, `no focusUpdate for thread ID ${threadID}`);

    const latestMessage = _max(
      focusUpdates
        .filter(
          (update) =>
            update.latestMessage && !update.latestMessage.startsWith('local'),
        )
        .map((update) => parseInt(update.latestMessage)),
    );
    if (latestMessage) {
      latestMessages.set(threadID, latestMessage);
    }

    const focusEnded = focusUpdates.some((update) => !update.focus);

    if (!focusEnded) {
      currentlyFocused.push(threadID);
      rescindConditions.push(SQL`n.thread = ${threadID}`);
    } else {
      unfocusedLatestMessages.set(threadID, latestMessage ?? 0);
      if (latestMessage) {
        rescindConditions.push(
          SQL`(n.thread = ${threadID} AND n.message <= ${latestMessage})`,
        );
      }
    }
  }

  const focusUpdatePromise = updateFocusedRows(viewer, currentlyFocused);

  const outdatedUnfocused = await checkUnfocusedLatestMessage(
    viewer,
    unfocusedLatestMessages,
  );

  const setToRead = [...currentlyFocused];
  const setToUnread = [];
  for (const [threadID] of unfocusedLatestMessages) {
    if (!outdatedUnfocused.includes(threadID)) {
      setToRead.push(threadID);
    } else {
      setToUnread.push(threadID);
    }
  }

  const time = Date.now();
  const updateDatas = [];
  const appendUpdateDatas = (
    threadIDs: $ReadOnlyArray<string>,
    unread: boolean,
  ) => {
    for (const threadID of threadIDs) {
      updateDatas.push({
        type: updateTypes.UPDATE_THREAD_READ_STATUS,
        userID: viewer.userID,
        time,
        threadID,
        unread,
      });
    }
  };

  appendUpdateDatas(setToRead, false);
  appendUpdateDatas(setToUnread, true);

  const updateLatestReadMessagePromise = updateLastReadMessage(
    viewer,
    latestMessages,
  );
  const updatesPromise = createUpdates(updateDatas, {
    viewer,
    updatesForCurrentSession: 'ignore',
  });

  await Promise.all([
    focusUpdatePromise,
    updateLatestReadMessagePromise,
    updatesPromise,
  ]);

  // We do this afterwards so the badge count is correct
  if (rescindConditions.length > 0) {
    const rescindCondition = SQL`n.user = ${viewer.userID} AND `;
    rescindCondition.append(mergeOrConditions(rescindConditions));
    await rescindPushNotifs(rescindCondition);
  }

  return { unfocusedToUnread: outdatedUnfocused };
}

async function updateFocusedRows(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
): Promise<void> {
  const time = Date.now();
  if (threadIDs.length > 0) {
    const focusedInsertRows = threadIDs.map((threadID) => [
      viewer.userID,
      viewer.session,
      threadID,
      time,
    ]);
    await dbQuery(SQL`
      INSERT INTO focused (user, session, thread, time)
      VALUES ${focusedInsertRows}
      ON DUPLICATE KEY UPDATE time = VALUES(time)
    `);
  }
  await deleteActivityForViewerSession(viewer, time);
}

// To protect against a possible race condition, we reset the thread to unread
// if the latest message ID on the client at the time that focus was dropped
// is no longer the latest message ID.
// Returns the set of unfocused threads that should be set to unread on
// the client because a new message arrived since they were unfocused.
async function checkUnfocusedLatestMessage(
  viewer: Viewer,
  unfocusedLatestMessages: Map<string, number>,
): Promise<string[]> {
  if (unfocusedLatestMessages.size === 0 || !viewer.loggedIn) {
    return [];
  }

  const unfocusedThreadIDs = [...unfocusedLatestMessages.keys()];
  const focusedElsewhereThreadIDs = await checkThreadsFocused(
    viewer,
    unfocusedThreadIDs,
  );
  const unreadCandidates = _difference(unfocusedThreadIDs)(
    focusedElsewhereThreadIDs,
  );
  if (unreadCandidates.length === 0) {
    return [];
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

  const resetToUnread = [];
  for (const row of result) {
    const threadID = row.thread.toString();
    const serverLatestMessage = row.latest_message;
    const clientLatestMessage = unfocusedLatestMessages.get(threadID);
    if (clientLatestMessage < serverLatestMessage) {
      resetToUnread.push(threadID);
    }
  }
  return resetToUnread;
}

async function checkThreadsFocused(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
): Promise<string[]> {
  const time = earliestFocusedTimeConsideredCurrent();
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

  return await dbQuery(query);
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

  const excludeDeviceTokens = [];
  if (!request.unread) {
    const rescindCondition = SQL`
      n.user = ${viewer.userID} AND
      n.thread = ${request.threadID} AND
      n.message <= ${request.latestMessage}
    `;
    const handledDeviceTokens = await rescindPushNotifs(rescindCondition);
    excludeDeviceTokens.push(...handledDeviceTokens);
  }

  await updateBadgeCount(
    viewer,
    request.unread ? 'mark_as_unread' : 'mark_as_read',
    excludeDeviceTokens,
  );

  return {
    resetToUnread: resetThreadToUnread,
  };
}

async function shouldResetThreadToUnread(
  viewer: Viewer,
  request: SetThreadUnreadStatusRequest,
): Promise<boolean> {
  if (request.unread) {
    return false;
  }

  const resetToUnread = await checkUnfocusedLatestMessage(
    viewer,
    new Map([[request.threadID, parseInt(request.latestMessage) || 0]]),
  );

  return resetToUnread.some((threadID) => threadID === request.threadID);
}

// The `focused` table tracks which chat threads are currently in view for a
// given cookie. We track this so that if a user is currently viewing a thread's
// messages, then notifications on that thread are not sent. This function does
// not add new rows to the `focused` table, but instead extends currently active
// rows for the current cookie.
async function updateActivityTime(viewer: Viewer): Promise<void> {
  if (!viewer.loggedIn) {
    return;
  }
  const time = Date.now();
  const focusedQuery = SQL`
    UPDATE focused
    SET time = ${time}
    WHERE user = ${viewer.userID} AND session = ${viewer.session}
  `;
  await dbQuery(focusedQuery);
}

export { activityUpdater, updateActivityTime, setThreadUnreadStatus };
