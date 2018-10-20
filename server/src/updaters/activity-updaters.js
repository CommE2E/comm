// @flow

import type { Viewer } from '../session/viewer';
import type {
  UpdateActivityResult,
  UpdateActivityRequest,
} from 'lib/types/activity-types';
import { messageTypes } from 'lib/types/message-types';
import { threadPermissions } from 'lib/types/thread-types';
import { updateTypes } from 'lib/types/update-types';

import invariant from 'invariant';
import _difference from 'lodash/fp/difference';

import { earliestTimeConsideredCurrent } from 'lib/shared/ping-utils';
import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL, mergeOrConditions } from '../database';
import { verifyThreadIDs } from '../fetchers/thread-fetchers';
import { rescindPushNotifs } from '../push/rescind';
import { createUpdates } from '../creators/update-creator';

async function activityUpdater(
  viewer: Viewer,
  request: UpdateActivityRequest,
): Promise<UpdateActivityResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const unverifiedThreadIDs = new Set();
  const focusUpdatesByThreadID = new Map();
  for (let activityUpdate of request.updates) {
    if (activityUpdate.closing) {
      // This was deprecated, but old clients are still sending it
      continue;
    }
    const threadID = activityUpdate.threadID;
    unverifiedThreadIDs.add(threadID);
    let updatesForThreadID = focusUpdatesByThreadID.get(threadID);
    if (!updatesForThreadID) {
      updatesForThreadID = [];
      focusUpdatesByThreadID.set(updatesForThreadID);
    }
    updatesForThreadID.push(activityUpdate);
  }

  const verifiedThreadIDs = await verifyThreadIDs([...unverifiedThreadIDs]);

  const focusedThreadIDs = new Set();
  const unfocusedThreadIDs = new Set();
  const unfocusedThreadLatestMessages = new Map();
  for (let threadID of verifiedThreadIDs) {
    const focusUpdates = focusUpdatesByThreadID.get(threadID);
    invariant(focusUpdates, `n  focusUpdate for thread ID ${threadID}`);
    for (let focusUpdate of focusUpdates) {
      if (focusUpdate.focus) {
        focusedThreadIDs.add(threadID);
      } else if (focusUpdate.focus === false) {
        unfocusedThreadIDs.add(threadID);
        unfocusedThreadLatestMessages.set(
          threadID,
          focusUpdate.latestMessage ? focusUpdate.latestMessage : "0",
        );
      }
    }
  }

  const membershipQuery = SQL`
    SELECT thread
    FROM memberships
    WHERE role != 0
      AND thread IN (${[...focusedThreadIDs, ...unfocusedThreadIDs]})
      AND user = ${viewer.userID}
  `;
  const [ membershipResult ] = await dbQuery(membershipQuery);

  const viewerMemberThreads = new Set();
  for (let row of membershipResult) {
    const threadID = row.thread.toString();
    viewerMemberThreads.add(threadID);
  }
  const filterFunc = threadID => viewerMemberThreads.has(threadID);
  const memberFocusedThreadIDs = [...focusedThreadIDs].filter(filterFunc);
  const memberUnfocusedThreadIDs = [...unfocusedThreadIDs].filter(filterFunc);

  const promises = [];
  promises.push(updateFocusedRows(viewer, memberFocusedThreadIDs));
  if (memberFocusedThreadIDs.length > 0) {
    promises.push(dbQuery(SQL`
      UPDATE memberships
      SET unread = 0
      WHERE thread IN (${memberFocusedThreadIDs})
        AND user = ${viewer.userID}
    `));
    const time = Date.now();
    promises.push(createUpdates(
      memberFocusedThreadIDs.map(threadID => ({
        type: updateTypes.UPDATE_THREAD_READ_STATUS,
        userID: viewer.userID,
        time,
        threadID,
        unread: false,
      })),
      { viewer },
    ));
    const rescindCondition = SQL`
      n.user = ${viewer.userID} AND n.thread IN (${memberFocusedThreadIDs})
    `;
    promises.push(rescindPushNotifs(rescindCondition));
  }
  await Promise.all(promises);

  const unfocusedToUnread = await possiblyResetThreadsToUnread(
    viewer,
    memberUnfocusedThreadIDs,
    unfocusedThreadLatestMessages,
  );

  return { unfocusedToUnread };
}

async function updateFocusedRows(
  viewer: Viewer,
  threadIDs: $ReadOnlyArray<string>,
): Promise<void> {
  const time = Date.now();
  if (threadIDs.length > 0) {
    const focusedInsertRows = threadIDs.map(threadID => [
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
  await dbQuery(SQL`
    DELETE FROM focused
    WHERE user = ${viewer.userID} AND session = ${viewer.session}
      AND time < ${time}
  `);
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
    LEFT JOIN memberships stm ON m.type = ${messageTypes.CREATE_SUB_THREAD}
      AND stm.thread = m.content AND stm.user = ${viewer.userID}
    WHERE m.thread IN (${unreadCandidates}) AND
      (
        m.type != ${messageTypes.CREATE_SUB_THREAD} OR
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

  const time = Date.now();
  const promises = [];
  const unreadQuery = SQL`
    UPDATE memberships
    SET unread = 1
    WHERE thread IN (${resetToUnread})
      AND user = ${viewer.userID}
  `;
  promises.push(dbQuery(unreadQuery));
  promises.push(createUpdates(
    resetToUnread.map(threadID => ({
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      userID: viewer.userID,
      time,
      threadID,
      unread: true,
    })),
    { viewer },
  ));
  await Promise.all(promises);

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

export {
  activityUpdater,
  updateActivityTime,
};
