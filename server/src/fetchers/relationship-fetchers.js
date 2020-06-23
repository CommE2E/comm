// @flow

import type { Viewer } from '../session/viewer';
import {
  type RelationshipErrors,
  undirectedStatus,
  directedStatus,
} from 'lib/types/relationship-types';

import _groupBy from 'lodash/fp/groupBy';
import invariant from 'invariant';

import { dbQuery, SQL } from '../database';

type RelationshipOperation =
  | 'delete_directed'
  | 'friend'
  | 'pending_friend'
  | 'know_of';
type UserRelationshipOperations = {
  [string]: $ReadOnlyArray<RelationshipOperation>,
};

async function fetchFriendRequestRelationshipOperations(
  viewer: Viewer,
  userIDs: string[],
) {
  const query = SQL`
    SELECT user1, user2, status
    FROM relationships_directed
    WHERE
      (user1 IN (${userIDs}) AND user2 = ${viewer.userID}) OR
      (user1 = ${viewer.userID} AND user2 IN (${userIDs}))
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
  const userRelationshipOperations: UserRelationshipOperations = {};
  for (const userID in relationshipsByUserId) {
    const relationships = relationshipsByUserId[userID];

    if (relationships.length === 3) {
      userRelationshipOperations[userID] = ['delete_directed'];
      continue;
    }

    if (relationships.length === 1) {
      userRelationshipOperations[userID] = ['pending_friend'];
      continue;
    }

    const [relationship] = relationshipsByUserId[userID].filter(
      r => r.status !== undirectedStatus.KNOW_OF,
    );

    if (relationship.status === directedStatus.PENDING_FRIEND) {
      if (relationship.user2.toString() === viewer.userID) {
        userRelationshipOperations[userID] = ['friend', 'delete_directed'];
      } else {
        userRelationshipOperations[userID] = [];
      }
    } else if (relationship.status === directedStatus.BLOCKED) {
      if (relationship.user1.toString() === viewer.userID) {
        userRelationshipOperations[userID] = ['pending_friend'];
      } else {
        const user_blocked = errors.user_blocked || [];
        errors.user_blocked = [...user_blocked, userID];
        userRelationshipOperations[userID] = [];
      }
    } else if (relationship.status === undirectedStatus.FRIEND) {
      const already_friends = errors.already_friends || [];
      errors.already_friends = [...already_friends, userID];
      userRelationshipOperations[userID] = [];
    } else {
      userRelationshipOperations[userID] = [];
      invariant(false, `unexpected relationship status ${relationship.status}`);
    }
  }

  for (let userID of userIDs) {
    if (!(userID in userRelationshipOperations)) {
      userRelationshipOperations[userID] = ['know_of', 'pending_friend'];
    }
  }

  return { errors, userRelationshipOperations };
}

export { fetchFriendRequestRelationshipOperations };
