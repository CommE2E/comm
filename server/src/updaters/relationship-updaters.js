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
import { fetchFriendRequestRelationshipActions } from '../fetchers/relationship-fetchers';
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

  const errors: RelationshipErrors = {};
  const userIDs: string[] = [];
  for (let userID of uniqueUserIDs) {
    if (userID === viewer.userID || !users[userID].username) {
      const acc = errors.invalid_user || [];
      errors.invalid_user = [...acc, userID];
    } else {
      userIDs.push(userID);
    }
  }

  if (action === 'send_friend_request') {
    const {
      relationshipActions,
      errors: friendRequestErrors,
    } = await fetchFriendRequestRelationshipActions(viewer, userIDs);

    const undirectedInsertRows = [];
    const directedInsertRows = [];
    const directedDeleteIDs = [];
    for (const userID in relationshipActions) {
      const relationshipAction = relationshipActions[userID];
      const IDs = [userID, viewer.userID].map(Number).sort((a, b) => a - b);

      if (relationshipAction === 'pending_friend') {
        undirectedInsertRows.push([...IDs, undirectedStatus.KNOW_OF]);
        const status = directedStatus.PENDING_FRIEND;
        directedInsertRows.push([viewer.userID, userID, status]);
      } else if (relationshipAction === 'friend') {
        undirectedInsertRows.push([...IDs, undirectedStatus.FRIEND]);
        directedDeleteIDs.push(userID);
      } else {
        // do nothing for this user
      }
    }

    const undirectedInsertQuery = SQL`
      INSERT INTO know_of_friends (user1, user2, status)
      VALUES ${undirectedInsertRows}
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `;
    const directedInsertQuery = SQL`
      INSERT INTO friend_requests_blocks (user1, user2, status)
      VALUES ${directedInsertRows}
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `;
    const directedDeleteQuery = SQL`
      DELETE FROM friend_requests_blocks WHERE user1 IN (${directedDeleteIDs}) and user2 = ${viewer.userID}
    `;

    const promises = [
      dbQuery(undirectedInsertQuery),
      dbQuery(directedInsertQuery),
    ];

    if (directedDeleteQuery.length) {
      promises.push(dbQuery(directedDeleteQuery));
    }

    await Promise.all(promises);

    return { ...errors, friendRequestErrors };
  } else {
    invariant(false, `action ${action} is invalid or not supported currently`);
  }
}

export { updateRelationships };
