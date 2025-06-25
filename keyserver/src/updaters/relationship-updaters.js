// @flow

import invariant from 'invariant';

import { sortUserIDs } from 'lib/shared/relationship-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  type RelationshipErrors,
  type UndirectedRelationshipRow,
  relationshipActions,
  undirectedStatus,
  directedStatus,
  type RelationshipRequest,
} from 'lib/types/relationship-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { NewThreadResponse } from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types-enum.js';
import { type UpdateData } from 'lib/types/update-types.js';
import { cartesianProduct } from 'lib/utils/array.js';
import { ServerError } from 'lib/utils/errors.js';
import { promiseAll } from 'lib/utils/promises.js';

import createMessages from '../creators/message-creator.js';
import { createThread } from '../creators/thread-creator.js';
import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL, mergeOrConditions } from '../database/database.js';
import { fetchFriendRequestRelationshipOperations } from '../fetchers/relationship-fetchers.js';
import { fetchUserInfos } from '../fetchers/user-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { findUserIdentities } from '../utils/identity-utils.js';

async function updateRelationships(
  viewer: Viewer,
  request: RelationshipRequest,
): Promise<RelationshipErrors> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const requestUserIDs = Object.keys(request.users);
  const uniqueUserIDs = [...new Set(requestUserIDs)];
  const users = await fetchUserInfos(uniqueUserIDs);

  let errors: RelationshipErrors = {};
  const userIDs: string[] = [];
  for (const userID of uniqueUserIDs) {
    if (userID === viewer.userID || !users[userID].username) {
      const acc = errors.invalid_user || [];
      errors = { ...errors, invalid_user: [...acc, userID] };
    } else {
      userIDs.push(userID);
    }
  }
  if (!userIDs.length) {
    return Object.freeze({ ...errors });
  }

  const updateIDs = [];
  if (request.action === relationshipActions.FRIEND) {
    const usersToCreateRobotextFor = userIDs.filter(
      userID => request.users[userID].createRobotextInThinThread,
    );
    // We have to create personal threads before setting the relationship
    // status. By doing that we make sure that failed thread creation is
    // reported to the caller and can be repeated - there should be only
    // one GENESIS_PERSONAL thread per a pair of users and we can safely
    // call it repeatedly.
    const threadIDPerUser = await createPersonalThreads(
      viewer,
      request,
      usersToCreateRobotextFor,
    );
    const { userRelationshipOperations, errors: friendRequestErrors } =
      await fetchFriendRequestRelationshipOperations(viewer, userIDs);
    errors = { ...errors, ...friendRequestErrors };

    const undirectedInsertRows = [];
    const directedInsertRows = [];
    const directedDeleteIDs = [];
    const messageDatas = [];
    const now = Date.now();
    for (const userID of Object.keys(userRelationshipOperations)) {
      const operations = userRelationshipOperations[userID];
      const ids = sortUserIDs(viewer.userID, userID);

      if (operations.length) {
        updateIDs.push(userID);
      }

      for (const operation of operations) {
        if (operation === 'delete_directed') {
          directedDeleteIDs.push(userID);
        } else if (operation === 'friend') {
          const [user1, user2] = ids;
          const status = undirectedStatus.FRIEND;
          undirectedInsertRows.push({ user1, user2, status });
          if (request.users[userID].createRobotextInThinThread) {
            messageDatas.push({
              type: messageTypes.LEGACY_UPDATE_RELATIONSHIP,
              threadID: threadIDPerUser[userID],
              creatorID: viewer.userID,
              targetID: userID,
              time: now,
              operation: 'request_accepted',
            });
          }
        } else if (operation === 'pending_friend') {
          const status = directedStatus.PENDING_FRIEND;
          directedInsertRows.push([viewer.userID, userID, status]);
          if (request.users[userID].createRobotextInThinThread) {
            messageDatas.push({
              type: messageTypes.LEGACY_UPDATE_RELATIONSHIP,
              threadID: threadIDPerUser[userID],
              creatorID: viewer.userID,
              targetID: userID,
              time: now,
              operation: 'request_sent',
            });
          }
        } else if (operation === 'know_of') {
          const [user1, user2] = ids;
          const status = undirectedStatus.KNOW_OF;
          undirectedInsertRows.push({ user1, user2, status });
        } else {
          invariant(false, `unexpected relationship operation ${operation}`);
        }
      }
    }

    const promises: Array<Promise<mixed>> = [
      updateUndirectedRelationships(undirectedInsertRows),
    ];
    if (directedInsertRows.length) {
      const directedInsertQuery = SQL`
        INSERT INTO relationships_directed (user1, user2, status)
        VALUES ${directedInsertRows}
        ON DUPLICATE KEY UPDATE status = VALUE(status)
      `;
      promises.push(dbQuery(directedInsertQuery));
    }
    if (directedDeleteIDs.length) {
      const directedDeleteQuery = SQL`
        DELETE FROM relationships_directed
        WHERE 
          (user1 = ${viewer.userID} AND user2 IN (${directedDeleteIDs})) OR
          (status = ${directedStatus.PENDING_FRIEND} AND 
            user1 IN (${directedDeleteIDs}) AND user2 = ${viewer.userID})
      `;
      promises.push(dbQuery(directedDeleteQuery));
    }
    if (messageDatas.length > 0) {
      promises.push(createMessages(viewer, messageDatas, 'broadcast'));
    }

    await Promise.all(promises);
  } else if (request.action === relationshipActions.UNFRIEND) {
    updateIDs.push(...userIDs);

    const updateRows = userIDs.map(userID => {
      const [user1, user2] = sortUserIDs(viewer.userID, userID);
      return { user1, user2, status: undirectedStatus.KNOW_OF };
    });

    const deleteQuery = SQL`
      DELETE FROM relationships_directed
      WHERE 
        status = ${directedStatus.PENDING_FRIEND} AND 
        (user1 = ${viewer.userID} AND user2 IN (${userIDs}) OR 
          user1 IN (${userIDs}) AND user2 = ${viewer.userID})
    `;

    await Promise.all([
      updateUndirectedRelationships(updateRows, false),
      dbQuery(deleteQuery),
    ]);
  } else if (request.action === relationshipActions.BLOCK) {
    updateIDs.push(...userIDs);

    const directedRows = [];
    const undirectedRows = [];
    for (const userID of userIDs) {
      directedRows.push([viewer.userID, userID, directedStatus.BLOCKED]);
      const [user1, user2] = sortUserIDs(viewer.userID, userID);
      undirectedRows.push({ user1, user2, status: undirectedStatus.KNOW_OF });
    }

    const directedInsertQuery = SQL`
      INSERT INTO relationships_directed (user1, user2, status)
      VALUES ${directedRows}
      ON DUPLICATE KEY UPDATE status = VALUE(status)
    `;
    const directedDeleteQuery = SQL`
      DELETE FROM relationships_directed
      WHERE status = ${directedStatus.PENDING_FRIEND} AND 
        user1 IN (${userIDs}) AND user2 = ${viewer.userID}
    `;

    await Promise.all([
      dbQuery(directedInsertQuery),
      dbQuery(directedDeleteQuery),
      updateUndirectedRelationships(undirectedRows, false),
    ]);
  } else if (request.action === relationshipActions.UNBLOCK) {
    updateIDs.push(...userIDs);

    const query = SQL`
      DELETE FROM relationships_directed
      WHERE status = ${directedStatus.BLOCKED} AND 
        user1 = ${viewer.userID} AND user2 IN (${userIDs})
    `;
    await dbQuery(query);
  } else if (request.action === relationshipActions.FARCASTER_MUTUAL) {
    const viewerID = viewer.userID;
    const { identities: userIdentities } = await findUserIdentities([
      ...userIDs,
      viewerID,
    ]);

    const viewerFID = userIdentities[viewerID]?.farcasterID;
    if (!viewerFID) {
      throw new ServerError('viewer_fid_missing');
    }

    const userIDsToFIDs = new Map<string, string>();
    for (const userID in userIdentities) {
      if (userID === viewerID) {
        continue;
      }
      const fid = userIdentities[userID].farcasterID;
      if (fid) {
        userIDsToFIDs.set(userID, fid);
      }
    }
    const usersToCreateRobotextFor = [...userIDsToFIDs.entries()].filter(
      ([userID]) => request.users[userID].createRobotextInThinThread,
    );
    const userIDsToCreateRobotextFor = usersToCreateRobotextFor.map(
      ([userID]) => userID,
    );

    // We have to create personal threads before setting the relationship
    // status. By doing that we make sure that failed thread creation is
    // reported to the caller and can be repeated - there should be only
    // one GENESIS_PERSONAL thread per a pair of users and we can safely
    // call it repeatedly.
    const threadIDPerUser = await createPersonalThreads(
      viewer,
      request,
      userIDsToCreateRobotextFor,
    );

    const insertRows = [...userIDsToFIDs.keys()].map(otherUserID => {
      const [user1, user2] = sortUserIDs(viewer.userID, otherUserID);
      return { user1, user2, status: undirectedStatus.FRIEND };
    });
    const updateDatas = await updateChangedUndirectedRelationships(insertRows);
    await createUpdates(updateDatas);

    const now = Date.now();
    const messageDatas = usersToCreateRobotextFor.map(
      ([otherUserID, otherUserFID]) => ({
        type: messageTypes.UPDATE_RELATIONSHIP,
        threadID: threadIDPerUser[otherUserID],
        creatorID: viewer.userID,
        creatorFID: viewerFID,
        targetID: otherUserID,
        targetFID: otherUserFID,
        time: now,
        operation: 'farcaster_mutual',
      }),
    );
    await createMessages(viewer, messageDatas, 'broadcast');
  } else if (request.action === relationshipActions.ACKNOWLEDGE) {
    updateIDs.push(...userIDs);

    const insertRows = userIDs.map(userID => {
      const [user1, user2] = sortUserIDs(viewer.userID, userID);
      return { user1, user2, status: undirectedStatus.KNOW_OF };
    });

    const updateDatas = await updateChangedUndirectedRelationships(insertRows);
    await createUpdates(updateDatas);
  } else {
    invariant(
      false,
      `action ${request.action} is invalid or not supported currently`,
    );
  }

  await createUpdates(
    updateDatasForUserPairs(cartesianProduct([viewer.userID], updateIDs)),
  );

  return Object.freeze({ ...errors });
}

function updateDatasForUserPairs(
  userPairs: $ReadOnlyArray<[string, string]>,
): UpdateData[] {
  const time = Date.now();
  const updateDatas: Array<UpdateData> = [];
  for (const [user1, user2] of userPairs) {
    updateDatas.push({
      type: updateTypes.UPDATE_USER,
      userID: user1,
      time,
      updatedUserID: user2,
    });
    updateDatas.push({
      type: updateTypes.UPDATE_USER,
      userID: user2,
      time,
      updatedUserID: user1,
    });
  }
  return updateDatas;
}

async function updateUndirectedRelationships(
  changeset: $ReadOnlyArray<UndirectedRelationshipRow>,
  greatest: boolean = true,
) {
  if (!changeset.length) {
    return;
  }

  const rows = changeset.map(row => [row.user1, row.user2, row.status]);
  const query = SQL`
    INSERT INTO relationships_undirected (user1, user2, status)
    VALUES ${rows}
  `;
  if (greatest) {
    query.append(
      SQL`ON DUPLICATE KEY UPDATE status = GREATEST(status, VALUE(status))`,
    );
  } else {
    query.append(SQL`ON DUPLICATE KEY UPDATE status = VALUE(status)`);
  }
  await dbQuery(query);
}

async function updateChangedUndirectedRelationships(
  changeset: $ReadOnlyArray<UndirectedRelationshipRow>,
): Promise<UpdateData[]> {
  if (changeset.length === 0) {
    return [];
  }

  const user2ByUser1: Map<string, Set<string>> = new Map();
  for (const { user1, user2 } of changeset) {
    if (!user2ByUser1.has(user1)) {
      user2ByUser1.set(user1, new Set());
    }
    user2ByUser1.get(user1)?.add(user2);
  }

  const selectQuery = SQL`
    SELECT user1, user2, status
    FROM relationships_undirected
    WHERE
  `;
  const conditions = [];
  for (const [user1, users] of user2ByUser1) {
    conditions.push(SQL`(user1 = ${user1} AND user2 IN (${[...users]}))`);
  }
  selectQuery.append(mergeOrConditions(conditions));

  const [result] = await dbQuery(selectQuery);
  const existingStatuses = new Map<string, number>();
  for (const row of result) {
    existingStatuses.set(`${row.user1}|${row.user2}`, row.status);
  }

  const insertRows = [];
  for (const row of changeset) {
    const existingStatus = existingStatuses.get(`${row.user1}|${row.user2}`);
    if (!existingStatus || existingStatus < row.status) {
      insertRows.push([row.user1, row.user2, row.status]);
    }
  }
  if (insertRows.length === 0) {
    return [];
  }
  const insertQuery = SQL`
    INSERT INTO relationships_undirected (user1, user2, status)
    VALUES ${insertRows}
    ON DUPLICATE KEY UPDATE status = GREATEST(status, VALUE(status))
  `;
  await dbQuery(insertQuery);

  return updateDatasForUserPairs(
    insertRows.map(([user1, user2]) => [user1, user2]),
  );
}

async function createPersonalThreads(
  viewer: Viewer,
  request: RelationshipRequest,
  userIDs: $ReadOnlyArray<string>,
): Promise<{ [string]: string }> {
  // If you add another RelationshipAction to the supported list below, you'll
  // probably want to add it to the FRIEND / FARCASTER_MUTUAL special cases in
  // useUpdateRelationships as well
  invariant(
    request.action === relationshipActions.FRIEND ||
      request.action === relationshipActions.FARCASTER_MUTUAL,
    'We should only create a GENESIS_PERSONAL threads when sending FRIEND or ' +
      'FARCASTER_MUTUAL requests, but we tried to do that for ' +
      request.action,
  );

  if (userIDs.length === 0) {
    return {};
  }

  const threadIDPerUser: { [string]: string } = {};

  const personalThreadsQuery = SQL`
    SELECT t.id AS threadID, m2.user AS user2
    FROM threads t
    INNER JOIN memberships m1
      ON m1.thread = t.id AND m1.user = ${viewer.userID}
    INNER JOIN memberships m2
      ON m2.thread = t.id AND m2.user IN (${userIDs})
    WHERE t.type = ${threadTypes.GENESIS_PERSONAL}
      AND m1.role > 0
      AND m2.role > 0
  `;
  const [personalThreadsResult] = await dbQuery(personalThreadsQuery);

  for (const row of personalThreadsResult) {
    const user2 = row.user2.toString();
    threadIDPerUser[user2] = row.threadID.toString();
  }

  const threadCreationPromises: { [string]: Promise<NewThreadResponse> } = {};
  for (const userID of userIDs) {
    if (threadIDPerUser[userID]) {
      continue;
    }
    threadCreationPromises[userID] = createThread(
      viewer,
      {
        type: threadTypes.GENESIS_PERSONAL,
        initialMemberIDs: [userID],
      },
      { forceAddMembers: true, updatesForCurrentSession: 'broadcast' },
    );
  }

  const personalThreadPerUser = await promiseAll(threadCreationPromises);

  for (const userID in personalThreadPerUser) {
    const newThread = personalThreadPerUser[userID];
    threadIDPerUser[userID] = newThread.newThreadID;
  }

  return threadIDPerUser;
}

export {
  updateRelationships,
  updateDatasForUserPairs,
  updateUndirectedRelationships,
  updateChangedUndirectedRelationships,
};
