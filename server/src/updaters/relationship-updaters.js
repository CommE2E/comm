// @flow

import type { Viewer } from '../session/viewer';
import {
  type RelationshipRequest,
  type RelationshipErrors,
  type UndirectedRelationshipRow,
  relationshipActions,
  undirectedStatus,
  directedStatus,
} from 'lib/types/relationship-types';
import { updateTypes, type UpdateData } from 'lib/types/update-types';

import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';
import { sortIDs } from 'lib/shared/relationship-utils';
import { cartesianProduct } from 'lib/utils/array';

import { fetchUserInfos } from '../fetchers/user-fetchers';
import { fetchFriendRequestRelationshipOperations } from '../fetchers/relationship-fetchers';
import { createUpdates } from '../creators/update-creator';
import { dbQuery, SQL } from '../database';

async function updateRelationships(
  viewer: Viewer,
  request: RelationshipRequest,
) {
  const { action } = request;

  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const uniqueUserIDs = [...new Set(request.userIDs)];
  const users = await fetchUserInfos(uniqueUserIDs);

  let errors: RelationshipErrors = {};
  const userIDs: string[] = [];
  for (let userID of uniqueUserIDs) {
    if (userID === viewer.userID || !users[userID].username) {
      const acc = errors.invalid_user || [];
      errors.invalid_user = [...acc, userID];
    } else {
      userIDs.push(userID);
    }
  }
  if (!userIDs.length) {
    return errors;
  }

  const updateIDs = [];
  if (action === relationshipActions.FRIEND) {
    const {
      userRelationshipOperations,
      errors: friendRequestErrors,
    } = await fetchFriendRequestRelationshipOperations(viewer, userIDs);
    errors = { ...errors, ...friendRequestErrors };

    const undirectedInsertRows = [];
    const directedInsertRows = [];
    const directedDeleteIDs = [];
    for (const userID in userRelationshipOperations) {
      const operations = userRelationshipOperations[userID];
      const ids = sortIDs(viewer.userID, userID);

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
        } else if (operation === 'pending_friend') {
          const status = directedStatus.PENDING_FRIEND;
          directedInsertRows.push([viewer.userID, userID, status]);
        } else if (operation === 'know_of') {
          const [user1, user2] = ids;
          const status = undirectedStatus.KNOW_OF;
          undirectedInsertRows.push({ user1, user2, status });
        } else {
          invariant(false, `unexpected relationship operation ${operation}`);
        }
      }
    }

    const promises = [updateUndirectedRelationships(undirectedInsertRows)];
    if (directedInsertRows.length) {
      const directedInsertQuery = SQL`
        INSERT INTO relationships_directed (user1, user2, status)
        VALUES ${directedInsertRows}
        ON DUPLICATE KEY UPDATE status = VALUES(status)
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

    await Promise.all(promises);
  } else if (action === relationshipActions.UNFRIEND) {
    updateIDs.push(...userIDs);

    const updateRows = userIDs.map(userID => {
      const [user1, user2] = sortIDs(viewer.userID, userID);
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
  } else if (action === relationshipActions.BLOCK) {
    updateIDs.push(...userIDs);

    const directedRows = [];
    const undirectedRows = [];
    for (const userID of userIDs) {
      directedRows.push([viewer.userID, userID, directedStatus.BLOCKED]);
      const [user1, user2] = sortIDs(viewer.userID, userID);
      undirectedRows.push({ user1, user2, status: undirectedStatus.KNOW_OF });
    }

    const directedInsertQuery = SQL`
      INSERT INTO relationships_directed (user1, user2, status)
      VALUES ${directedRows}
      ON DUPLICATE KEY UPDATE status = VALUES(status)
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
  } else if (action === relationshipActions.UNBLOCK) {
    updateIDs.push(...userIDs);

    const query = SQL`
      DELETE FROM relationships_directed
      WHERE status = ${directedStatus.BLOCKED} AND 
        user1 = ${viewer.userID} AND user2 IN (${userIDs})
    `;
    await dbQuery(query);
  } else {
    invariant(false, `action ${action} is invalid or not supported currently`);
  }

  await createUpdates(
    updateDatasForUserPairs(cartesianProduct([viewer.userID], updateIDs)),
  );

  return errors;
}

function updateDatasForUserPairs(
  userPairs: $ReadOnlyArray<[string, string]>,
): UpdateData[] {
  const time = Date.now();
  const updateDatas = [];
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
  changeset: UndirectedRelationshipRow[],
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
      SQL`ON DUPLICATE KEY UPDATE status = GREATEST(status, VALUES(status))`,
    );
  } else {
    query.append(SQL`ON DUPLICATE KEY UPDATE status = VALUES(status)`);
  }
  await dbQuery(query);
}

export {
  updateRelationships,
  updateDatasForUserPairs,
  updateUndirectedRelationships,
};
