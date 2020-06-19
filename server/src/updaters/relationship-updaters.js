// @flow

import type { Viewer } from '../session/viewer';

import invariant from 'invariant';
import _groupBy from 'lodash/fp/groupBy';
import _keyBy from 'lodash/fp/keyBy';

import {
  type RelationshipRequest,
  knowOfFriendsStatus,
  requestsBlocksStatus,
} from 'lib/types/relationship-types';
import { ServerError } from 'lib/utils/errors';

import { fetchUserInfos } from '../fetchers/user-fetchers';

import { dbQuery, SQL } from '../database';

type Errors = {
  invalid_user?: string[],
};

async function updateRelationship(
  viewer: Viewer,
  request: RelationshipRequest,
) {
  const { action } = request;

  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const uniqueUserIDs = [...new Set(request.userIDs)];
  const users = await fetchUserInfos(uniqueUserIDs);

  const errors: Errors = {};
  const userIDs: string[] = [];
  for (let userID of uniqueUserIDs) {
    if (userID === viewer.userID || !users[userID].username) {
      const acc = errors.invalid_user || [];
      errors.invalid_user = [...acc, userID];
    } else {
      userIDs.push(userID);
    }
  }

  if (action === 'friend_request') {
    const requestsOrBlockedSelectQuery = SQL`
      SELECT user1, user2, status from friend_requests_blocks 
      WHERE (
        (user1 = ${viewer.userID} AND user2 IN (${userIDs}))
        OR (user1 IN (${userIDs}) AND user2 = ${viewer.userID}) 
        AND status = ${requestsBlocksStatus.PENDING_FRIEND}
      ) 
      OR user1 = ${viewer.userID} AND status = ${requestsBlocksStatus.BLOCKED}
    `;

    const friendsOrBlockedMeSelectQuery = SQL`
      SELECT user1, user2, status from know_of_friends 
      WHERE (user1 = ${viewer.userID} OR user2 = ${viewer.userID}) AND status = ${knowOfFriendsStatus.FRIEND}
      UNION SELECT user1, user2, status from friend_requests_blocks 
      WHERE user2 = ${viewer.userID} AND status = ${requestsBlocksStatus.BLOCKED}
    `;

    const [
      [requestsOrBlockedResults],
      [friendsOrBlockedMeResult],
    ] = await Promise.all([
      dbQuery(requestsOrBlockedSelectQuery),
      dbQuery(friendsOrBlockedMeSelectQuery),
    ]);

    const knowOfFriendInsertRows = [];
    const requestBlockInsertRows = [];
    const requestBlockDeleteIDs = [];
    const restUserIds = _keyBy(id => id, userIDs);
    for (const relationship of requestsOrBlockedResults) {
      const { user1, user2 } = relationship;
      const bidirectionalIDs = [user1, user2].sort((a, b) => a - b);

      if (relationship.user1.toString() === viewer.userID) {
        knowOfFriendInsertRows.push([
          ...bidirectionalIDs,
          knowOfFriendsStatus.KNOW_OF,
        ]);
        requestBlockInsertRows.push([
          user1,
          user2,
          requestsBlocksStatus.PENDING_FRIEND,
        ]);
        delete restUserIds[user2];
      } else {
        knowOfFriendInsertRows.push([
          ...bidirectionalIDs,
          knowOfFriendsStatus.FRIEND,
        ]);
        requestBlockDeleteIDs.push(user1);
        delete restUserIds[user1];
      }
    }

    const rowsToIgnore = _groupBy(({ user1, user2 }) => {
      return user1.toString() === viewer.userID ? user2 : user1;
    }, friendsOrBlockedMeResult);
    const newRelationshipUserIDs = Object.keys(restUserIds).filter(
      userID => !(userID in rowsToIgnore),
    );
    for (const userID of newRelationshipUserIDs) {
      const bidirectionalIDs = [viewer.userID, userID]
        .map(Number)
        .sort((a, b) => a - b);

      knowOfFriendInsertRows.push([
        viewer.userID,
        userID,
        knowOfFriendsStatus.KNOW_OF,
      ]);
      requestBlockInsertRows.push([
        ...bidirectionalIDs,
        requestsBlocksStatus.PENDING_FRIEND,
      ]);
    }

    const knowOfFriendsInsertQuery = SQL`
      INSERT INTO know_of_friends (user1, user2, status) 
      VALUES ${knowOfFriendInsertRows} 
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `;

    const requestBlockInsertQuery = SQL`
      INSERT INTO friend_requests_blocks (user1, user2, status)
      VALUES ${requestBlockInsertRows} 
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `;

    const requestBlockDeleteQuery = SQL`
      DELETE FROM friend_requests_blocks WHERE user1 IN (${requestBlockDeleteIDs}) and user2 = ${viewer.userID}
    `;

    const promises = [
      dbQuery(knowOfFriendsInsertQuery),
      dbQuery(requestBlockInsertQuery),
    ];

    if (requestBlockDeleteIDs.length) {
      promises.push(dbQuery(requestBlockDeleteQuery));
    }

    await Promise.all(promises);
  } else {
    invariant(false, `action ${action} is invalid or not supported currently`);
  }

  return errors;
}

export { updateRelationship };
