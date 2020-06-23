// @flow

import type { Viewer } from '../session/viewer';
import {
  type RelationshipRequest,
  type RelationshipErrors,
  undirectedStatus,
  directedStatus,
} from 'lib/types/relationship-types';

import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';

import { fetchUserInfos } from '../fetchers/user-fetchers';
import { fetchFriendRequestRelationshipOperations } from '../fetchers/relationship-fetchers';
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

  const invalid_user: string[] = [];
  const userIDs: string[] = [];
  for (let userID of uniqueUserIDs) {
    if (userID === viewer.userID || !users[userID].username) {
      invalid_user.push(userID);
    } else {
      userIDs.push(userID);
    }
  }

  if (action === 'send_friend_request') {
    const {
      userRelationshipOperations,
      errors: friendRequestErrors,
    } = await fetchFriendRequestRelationshipOperations(viewer, userIDs);

    const undirectedInsertRows = [];
    const directedInsertRows = [];
    const directedDeleteIDs = [];
    for (const userID in userRelationshipOperations) {
      const operations = userRelationshipOperations[userID];
      const ids = [userID, viewer.userID].map(Number).sort((a, b) => a - b);

      for (const operation of operations) {
        if (operation === 'delete_directed') {
          directedDeleteIDs.push(userID);
        } else if (operation === 'friend') {
          undirectedInsertRows.push([...ids, undirectedStatus.FRIEND]);
        } else if (operation === 'pending_friend') {
          const status = directedStatus.PENDING_FRIEND;
          directedInsertRows.push([viewer.userID, userID, status]);
        } else if (operation === 'know_of') {
          undirectedInsertRows.push([...ids, undirectedStatus.KNOW_OF]);
        } else {
          invariant(false, `unexpected relationship operation ${operation}`);
        }
      }
    }

    const undirectedInsertQuery = SQL`
      INSERT INTO relationships_undirected (user1, user2, status)
      VALUES ${undirectedInsertRows}
      ON DUPLICATE KEY UPDATE status = MAX(status, VALUES(status))
    `;
    const directedInsertQuery = SQL`
      INSERT INTO relationships_directed (user1, user2, status)
      VALUES ${directedInsertRows}
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `;
    const directedDeleteQuery = SQL`
      DELETE FROM relationships_directed WHERE user1 IN (${directedDeleteIDs}) and user2 = ${viewer.userID}
    `;

    const promises = [
      dbQuery(undirectedInsertQuery),
      dbQuery(directedInsertQuery),
    ];

    if (directedDeleteQuery.length) {
      promises.push(dbQuery(directedDeleteQuery));
    }

    await Promise.all(promises);

    return { ...friendRequestErrors, invalid_user };
  } else {
    invariant(false, `action ${action} is invalid or not supported currently`);
  }
}

export { updateRelationships };
