// @flow

import type {
  ActivityUpdate,
  UpdateActivityResult,
} from 'lib/types/activity-types';

import invariant from 'invariant';
import _difference from 'lodash/fp/difference';

import { earliestTimeConsideredCurrent } from 'lib/shared/ping-utils';
import { messageType } from 'lib/types/message-types';
import { visibilityRules, threadPermissions } from 'lib/types/thread-types';
import { ServerError } from 'lib/utils/fetch-utils';

import { currentViewer } from '../session/viewer';
import { pool, SQL, mergeOrConditions } from '../database';
import { verifyThreadIDs } from '../fetchers/thread-fetchers';
import { rescindPushNotifs } from '../push/rescind';

async function activityUpdater(
  updates: $ReadOnlyArray<ActivityUpdate>,
): Promise<UpdateActivityResult> {
  const viewer = currentViewer();
  if (!viewer.loggedIn) {
    throw new ServerError('invalid_credentials');
  }

  const unverifiedThreadIDs = new Set();
  const focusUpdatesByThreadID = new Map();
  let closing = false;
  for (let activityUpdate of updates) {
    if (activityUpdate.closing) {
      closing = true;
      continue;
    }
    const threadID = activityUpdate.threadID;
    unverifiedThreadIDs.add(threadID);
    focusUpdatesByThreadID.set(threadID, activityUpdate);
  }

  const dbPromises = [];
  dbPromises.push(pool.query(SQL`
    DELETE FROM focused
    WHERE user = ${viewer.userID} AND cookie = ${viewer.cookieID}
  `));
  if (closing) {
    dbPromises.push(pool.query(SQL`
      UPDATE cookies SET last_ping = 0 WHERE id = ${viewer.cookieID}
    `));
  }
  const [ verifiedThreadIDs ] = await Promise.all([
    verifyThreadIDs([...unverifiedThreadIDs]),
    Promise.all(dbPromises),
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
    const time = Date.now();
    const focusedInsertRows = focusedThreadIDs.map(threadID => [
      viewer.userID,
      viewer.cookieID,
      threadID,
      time,
    ]);
    promises.push(pool.query(SQL`
      INSERT INTO focused (user, cookie, thread, time)
      VALUES ${focusedInsertRows}
    `));
    promises.push(pool.query(SQL`
      UPDATE memberships
      SET unread = 0
      WHERE role != 0
        AND thread IN (${focusedThreadIDs})
        AND user = ${viewer.userID}
    `));
    promises.push(rescindPushNotifs(
      viewer.userID,
      focusedThreadIDs,
    ));
  }

  const [ resetToUnread ] = await Promise.all([
    possiblyResetThreadsToUnread(
      unfocusedThreadIDs,
      unfocusedThreadLatestMessages,
    ),
    Promise.all(promises),
  ]);

  return { unfocusedToUnread: resetToUnread };
}

// To protect against a possible race condition, we reset the thread to unread
// if the latest message ID on the client at the time that focus was dropped
// is no longer the latest message ID.
// Returns the set of unfocused threads that should be set to unread on
// the client because a new message arrived since they were unfocused.
async function possiblyResetThreadsToUnread(
  unfocusedThreadIDs: $ReadOnlyArray<string>,
  unfocusedThreadLatestMessages: Map<string, string>,
): Promise<string[]> {
  const viewer = currentViewer();
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
    LEFT JOIN threads st ON m.type = ${messageType.CREATE_SUB_THREAD}
      AND st.id = m.content
    LEFT JOIN memberships stm ON m.type = ${messageType.CREATE_SUB_THREAD}
      AND stm.thread = m.content AND stm.user = ${viewer.userID}
    WHERE m.thread IN (${unreadCandidates}) AND
      (
        m.type != ${messageType.CREATE_SUB_THREAD} OR
        st.visibility_rules = ${visibilityRules.OPEN} OR
        JSON_EXTRACT(stm.permissions, ${knowOfExtractString}) IS TRUE
      )
    GROUP BY m.thread
  `;
  const [ result ] = await pool.query(query);

  const resetToUnread = [];
  for (let row of result) {
    const threadID = row.thread.toString();
    const serverLatestMessage = row.latest_message.toString();
    const clientLatestMessage = unfocusedThreadLatestMessages.get(threadID);
    if (clientLatestMessage !== serverLatestMessage) {
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
  await pool.query(unreadQuery);

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
  const [ result ] = await pool.query(query);

  const focusedThreadUserPairs = [];
  for (let row of result) {
    focusedThreadUserPairs.push([row.user.toString(), row.thread.toString()]);
  }
  return focusedThreadUserPairs;
}

async function updateActivityTime(
  time: number,
  clientSupportsMessages: bool,
): Promise<void> {
  const viewer = currentViewer();
  if (!viewer.loggedIn) {
    return;
  }

  const promises = [];
  const focusedQuery = SQL`
    UPDATE focused
    SET time = ${time}
    WHERE user = ${viewer.userID} AND cookie = ${viewer.cookieID}
  `;
  promises.push(pool.query(focusedQuery));
  if (clientSupportsMessages) {
    const cookieQuery = SQL`
      UPDATE cookies SET last_ping = ${time} WHERE id = ${viewer.cookieID}
    `;
    promises.push(pool.query(cookieQuery));
  }

  await Promise.all(promises);
}

export {
  activityUpdater,
  updateActivityTime,
};
