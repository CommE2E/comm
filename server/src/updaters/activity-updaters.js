// @flow

import type { Viewer } from '../session/viewer';
import type {
  UpdateActivityResult,
  UpdateActivityRequest,
} from 'lib/types/activity-types';
import { messageTypes } from 'lib/types/message-types';
import { threadTypes, threadPermissions } from 'lib/types/thread-types';

import invariant from 'invariant';
import _difference from 'lodash/fp/difference';

import { earliestTimeConsideredCurrent } from 'lib/shared/ping-utils';
import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL, mergeOrConditions } from '../database';
import { verifyThreadIDs } from '../fetchers/thread-fetchers';
import { rescindPushNotifs } from '../push/rescind';

async function activityUpdater(
  viewer: Viewer,
  request: UpdateActivityRequest,
): Promise<UpdateActivityResult> {
  const localViewer = viewer;
  if (!localViewer.loggedIn) {
    throw new ServerError('invalid_credentials');
  }

  const unverifiedThreadIDs = new Set();
  const focusUpdatesByThreadID = new Map();
  for (let activityUpdate of request.updates) {
    const threadID = activityUpdate.threadID;
    unverifiedThreadIDs.add(threadID);
    focusUpdatesByThreadID.set(threadID, activityUpdate);
  }

  const deleteQuery = SQL`
    DELETE FROM focused
    WHERE user = ${localViewer.userID} AND cookie = ${localViewer.cookieID}
  `;
  const [ verifiedThreadIDs ] = await Promise.all([
    verifyThreadIDs([...unverifiedThreadIDs]),
    dbQuery(deleteQuery),
  ]);

  const focusedThreadIDs = [];
  const unfocusedThreadIDs = [];
  const unfocusedThreadLatestMessages = new Map();
  for (let threadID of verifiedThreadIDs) {
    const focusUpdate = focusUpdatesByThreadID.get(threadID);
    invariant(focusUpdate, `no focusUpdate for thread ID ${threadID}`);
    if (focusUpdate.focus) {
      focusedThreadIDs.push(threadID);
    } else if (focusUpdate.focus === false) {
      unfocusedThreadIDs.push(threadID);
      unfocusedThreadLatestMessages.set(
        threadID,
        focusUpdate.latestMessage ? focusUpdate.latestMessage : "0",
      );
    }
  }

  const promises = [];
  if (focusedThreadIDs.length > 0) {
    promises.push(insertFocusedRows(localViewer, focusedThreadIDs));
    promises.push(dbQuery(SQL`
      UPDATE memberships
      SET unread = 0
      WHERE role != 0
        AND thread IN (${focusedThreadIDs})
        AND user = ${localViewer.userID}
    `));
    const rescindCondition = SQL`
      n.user = ${localViewer.userID} AND n.thread IN (${focusedThreadIDs})
    `;
    promises.push(rescindPushNotifs(rescindCondition));
  }

  const [ resetToUnread ] = await Promise.all([
    possiblyResetThreadsToUnread(
      localViewer,
      unfocusedThreadIDs,
      unfocusedThreadLatestMessages,
    ),
    Promise.all(promises),
  ]);

  return { unfocusedToUnread: resetToUnread };
}

async function insertFocusedRows(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
): Promise<void> {
  const time = Date.now();
  const focusedInsertRows = threadIDs.map(threadID => [
    viewer.userID,
    viewer.cookieID,
    threadID,
    time,
  ]);
  try {
    await dbQuery(SQL`
      INSERT INTO focused (user, cookie, thread, time)
      VALUES ${focusedInsertRows}
    `);
  } catch (e) {
    if (e.code !== "ER_DUP_ENTRY") {
      throw e;
    }
  }
}

// To protect against a possible race condition, we reset the thread to unread
// if the latest message ID on the client at the time that focus was dropped
// is no longer the latest message ID.
// Returns the set of unfocused threads that should be set to unread on
// the client because a new message arrived since they were unfocused.
async function possiblyResetThreadsToUnread(
  viewer: Viewer,
  unfocusedThreadIDs: $ReadOnlyArray<string>,
  unfocusedThreadLatestMessages: Map<string, string>,
): Promise<string[]> {
  if (unfocusedThreadIDs.length === 0 || !viewer.loggedIn) {
    return [];
  }

  const threadUserPairs = unfocusedThreadIDs.map(
    threadID => [viewer.userID, threadID],
  );
  const focusedElsewherePairs = await checkThreadsFocused(threadUserPairs);
  const focusedElsewhereThreadIDs = focusedElsewherePairs.map(pair => pair[1]);
  const unreadCandidates =
    _difference(unfocusedThreadIDs)(focusedElsewhereThreadIDs);
  if (unreadCandidates.length === 0) {
    return [];
  }

  const knowOfExtractString = `$.${threadPermissions.KNOW_OF}.value`;
  const query = SQL`
    SELECT m.thread, MAX(m.id) AS latest_message
    FROM messages m
    LEFT JOIN threads st ON m.type = ${messageTypes.CREATE_SUB_THREAD}
      AND st.id = m.content
    LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
      AND stm.thread = m.content AND stm.user = ${viewer.userID}
    WHERE m.thread IN (${unreadCandidates}) AND
      (
        m.type != ${messageTypes.CREATE_SUB_THREAD} OR
        st.type = ${threadTypes.OPEN} OR
        JSON_EXTRACT(stm.permissions, ${knowOfExtractString}) IS TRUE
      )
    GROUP BY m.thread
  `;
  const [ result ] = await dbQuery(query);

  const resetToUnread = [];
  for (let row of result) {
    const threadID = row.thread.toString();
    const serverLatestMessage = row.latest_message.toString();
    const clientLatestMessage = unfocusedThreadLatestMessages.get(threadID);
    invariant(
      clientLatestMessage,
      "latest message should be set for all provided threads",
    );
    if (
      !clientLatestMessage.startsWith("local") &&
      clientLatestMessage !== serverLatestMessage
    ) {
      resetToUnread.push(threadID);
    }
  }
  if (resetToUnread.length === 0) {
    return resetToUnread;
  }

  const unreadQuery = SQL`
    UPDATE memberships
    SET unread = 1
    WHERE role != 0
      AND thread IN (${resetToUnread})
      AND user = ${viewer.userID}
  `;
  await dbQuery(unreadQuery);

  return resetToUnread;
}

async function checkThreadsFocused(
  threadUserPairs: $ReadOnlyArray<[string, string]>,
): Promise<$ReadOnlyArray<[string, string]>> {
  const conditions = threadUserPairs.map(
    pair => SQL`(user = ${pair[0]} AND thread = ${pair[1]})`,
  );
  const time = earliestTimeConsideredCurrent();

  const query = SQL`
    SELECT user, thread
    FROM focused
    WHERE time > ${time} AND
  `;
  query.append(mergeOrConditions(conditions));
  query.append(SQL`GROUP BY user, thread`);
  const [ result ] = await dbQuery(query);

  const focusedThreadUserPairs = [];
  for (let row of result) {
    focusedThreadUserPairs.push([row.user.toString(), row.thread.toString()]);
  }
  return focusedThreadUserPairs;
}

// The `focused` table tracks which chat threads are currently in view for a
// given cookie. We track this so that if a user is currently viewing a thread's
// messages, then notification on that thread are not sent. This function does
// not add new rows to the `focused` table, but instead extends currently active
// rows for the current cookie. This is a no-op for clients that don't have any
// rows in the focused table (such as web, currently).
async function updateActivityTime(viewer: Viewer): Promise<void> {
  if (!viewer.loggedIn) {
    return;
  }
  const time = Date.now();
  const focusedQuery = SQL`
    UPDATE focused
    SET time = ${time}
    WHERE user = ${viewer.userID} AND cookie = ${viewer.cookieID}
  `;
  await dbQuery(focusedQuery);
}

export {
  activityUpdater,
  updateActivityTime,
};
