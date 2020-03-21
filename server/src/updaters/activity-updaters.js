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

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL, mergeOrConditions } from '../database';
import { rescindPushNotifs } from '../push/rescind';
import { createUpdates } from '../creators/update-creator';
import { deleteActivityForViewerSession } from '../deleters/activity-deleters';
import { earliestFocusedTimeConsideredCurrent } from '../shared/focused-times';
import { checkThreadPermissions } from '../fetchers/thread-fetchers';

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
      focusUpdatesByThreadID.set(threadID, updatesForThreadID);
    }
    updatesForThreadID.push(activityUpdate);
  }

  const permissionResults = await checkThreadPermissions(
    viewer,
    [...unverifiedThreadIDs],
    threadPermissions.VISIBLE,
  );
  const verifiedThreadIDs = Object.keys(permissionResults).filter(
    key => permissionResults[key],
  );
  if (verifiedThreadIDs.length === 0) {
    return { unfocusedToUnread: [] };
  }

  const viewerMemberThreadsPromise = (async () => {
    const membershipQuery = SQL`
      SELECT thread
      FROM memberships
      WHERE role != 0
        AND thread IN (${verifiedThreadIDs})
        AND user = ${viewer.userID}
    `;
    const [membershipResult] = await dbQuery(membershipQuery);
    const viewerMemberThreads = new Set();
    for (let row of membershipResult) {
      const threadID = row.thread.toString();
      viewerMemberThreads.add(threadID);
    }
    return viewerMemberThreads;
  })();

  const currentlyFocused = [];
  const unfocusedLatestMessages = new Map();
  const rescindConditions = [];
  for (let threadID of verifiedThreadIDs) {
    const focusUpdates = focusUpdatesByThreadID.get(threadID);
    invariant(focusUpdates, `no focusUpdate for thread ID ${threadID}`);

    let focusEndedAt = null;
    for (let focusUpdate of focusUpdates) {
      if (focusUpdate.focus === false) {
        focusEndedAt = focusUpdate.latestMessage
          ? focusUpdate.latestMessage
          : '0';
        // There should only ever be one of these in a request anyways
        break;
      }
    }

    if (!focusEndedAt) {
      currentlyFocused.push(threadID);
      rescindConditions.push(SQL`n.thread = ${threadID}`);
    } else {
      unfocusedLatestMessages.set(threadID, focusEndedAt);
      rescindConditions.push(
        SQL`(n.thread = ${threadID} AND n.message <= ${focusEndedAt})`,
      );
    }
  }

  const focusUpdatePromise = updateFocusedRows(viewer, currentlyFocused);

  const [viewerMemberThreads, unfocusedToUnread] = await Promise.all([
    viewerMemberThreadsPromise,
    determineUnfocusedThreadsReadStatus(viewer, unfocusedLatestMessages),
  ]);

  const setToRead = [...currentlyFocused];
  const setToUnread = [];
  for (let [threadID] of unfocusedLatestMessages) {
    if (!unfocusedToUnread.includes(threadID)) {
      setToRead.push(threadID);
    } else {
      setToUnread.push(threadID);
    }
  }

  const filterFunc = threadID => viewerMemberThreads.has(threadID);
  const memberSetToRead = setToRead.filter(filterFunc);
  const memberSetToUnread = setToUnread.filter(filterFunc);

  const time = Date.now();
  const updateDatas = [];
  const appendUpdateDatas = (
    threadIDs: $ReadOnlyArray<string>,
    unread: boolean,
  ) => {
    for (let threadID of threadIDs) {
      updateDatas.push({
        type: updateTypes.UPDATE_THREAD_READ_STATUS,
        userID: viewer.userID,
        time,
        threadID,
        unread,
      });
    }
  };

  const promises = [focusUpdatePromise];
  if (memberSetToRead.length > 0) {
    promises.push(
      dbQuery(SQL`
      UPDATE memberships
      SET unread = 0
      WHERE thread IN (${memberSetToRead})
        AND user = ${viewer.userID}
    `),
    );
    appendUpdateDatas(memberSetToRead, false);
  }
  if (memberSetToUnread.length > 0) {
    promises.push(
      dbQuery(SQL`
      UPDATE memberships
      SET unread = 1
      WHERE thread IN (${memberSetToUnread})
        AND user = ${viewer.userID}
    `),
    );
    appendUpdateDatas(memberSetToUnread, true);
  }
  promises.push(
    createUpdates(updateDatas, { viewer, updatesForCurrentSession: 'ignore' }),
  );

  await Promise.all(promises);

  // We do this afterwards so the badge count is correct
  const rescindCondition = SQL`n.user = ${viewer.userID} AND `;
  rescindCondition.append(mergeOrConditions(rescindConditions));
  await rescindPushNotifs(rescindCondition);

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
  await deleteActivityForViewerSession(viewer, time);
}

// To protect against a possible race condition, we reset the thread to unread
// if the latest message ID on the client at the time that focus was dropped
// is no longer the latest message ID.
// Returns the set of unfocused threads that should be set to unread on
// the client because a new message arrived since they were unfocused.
async function determineUnfocusedThreadsReadStatus(
  viewer: Viewer,
  unfocusedLatestMessages: Map<string, string>,
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
      (
        m.type != ${messageTypes.CREATE_SUB_THREAD} OR
        JSON_EXTRACT(stm.permissions, ${knowOfExtractString}) IS TRUE
      )
    GROUP BY m.thread
  `;
  const [result] = await dbQuery(query);

  const resetToUnread = [];
  for (let row of result) {
    const threadID = row.thread.toString();
    const serverLatestMessage = row.latest_message.toString();
    const clientLatestMessage = unfocusedLatestMessages.get(threadID);
    invariant(
      clientLatestMessage,
      'latest message should be set for all provided threads',
    );
    if (
      !clientLatestMessage.startsWith('local') &&
      clientLatestMessage !== serverLatestMessage
    ) {
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
  for (let row of result) {
    focusedThreadIDs.push(row.thread.toString());
  }
  return focusedThreadIDs;
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

export { activityUpdater, updateActivityTime };
