// @flow

import type { Viewer } from '../session/viewer';
import {
  type RelationshipErrors,
  undirectedStatus,
  directedStatus,
} from 'lib/types/relationship-types';

import _groupBy from 'lodash/fp/groupBy';

import { dbQuery, SQL } from '../database';

type Action = 'pending_friend' | 'friend' | void;
type UserActions = { [string]: Action };

async function fetchFriendRequestRelationshipActions(
  viewer: Viewer,
  userIDs: string[],
) {
  const query = SQL`
    SELECT user1, user2, status
    FROM relationships_directed
    WHERE
      (user1 IN (${userIDs}) AND user2 = ${viewer.userID}) OR
      (status = ${directedStatus.PENDING_FRIEND} AND
        user1 = ${viewer.userID} AND user2 IN (${userIDs}))
    UNION SELECT user1, user2, status
    FROM relationships_undirected
    WHERE
      (user1 = ${viewer.userID} AND user2 IN (${userIDs})) OR
      (user1 IN (${userIDs}) AND user2 = ${viewer.userID})
  `;

  const [result] = await dbQuery(query);

  const relationshipsByUserId = _groupBy(
    ({ user1, user2 }) => (user1.toString() === viewer.userID ? user2 : user1),
    result,
  );

  const errors: RelationshipErrors = {};
  const relationshipActions: UserActions = {};
  for (const userID in relationshipsByUserId) {
    const [relationship] = relationshipsByUserId[userID].filter(
      r => r.status !== undirectedStatus.KNOW_OF,
    );

    if (!relationship) {
      relationshipActions[userID] = 'pending_friend';
    } else if (relationship.status === directedStatus.PENDING_FRIEND) {
      if (relationship.user2.toString() === viewer.userID) {
        relationshipActions[userID] = 'friend';
      } else {
        relationshipActions[userID] = 'pending_friend';
      }
    } else if (relationship.status === directedStatus.BLOCKED) {
      const user_blocked = errors.user_blocked || [];
      errors.user_blocked = [...user_blocked, userID];
      relationshipActions[userID] = undefined;
    } else if (relationship.status === undirectedStatus.FRIEND) {
      const already_friends = errors.already_friends || [];
      errors.already_friends = [...already_friends, userID];
      relationshipActions[userID] = undefined;
    } else {
      relationshipActions[userID] = undefined;
    }
  }

  for (let userID of userIDs) {
    if (!(userID in relationshipActions)) {
      relationshipActions[userID] = 'pending_friend';
    }
  }

  return { errors, relationshipActions };
}

export { fetchFriendRequestRelationshipActions };
