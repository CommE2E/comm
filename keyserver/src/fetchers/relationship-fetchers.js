// @flow

import _groupBy from 'lodash/fp/groupBy.js';

import type { RelationshipErrors } from 'lib/types/relationship-types.js';
import {
  undirectedStatus,
  directedStatus,
} from 'lib/types/relationship-types.js';

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';

type RelationshipOperation =
  | 'delete_directed'
  | 'friend'
  | 'pending_friend'
  | 'know_of';
type UserRelationshipOperations = {
  [string]: $ReadOnlyArray<RelationshipOperation>,
};

type UserRelationshipOperationsResult = {
  +errors: RelationshipErrors,
  +userRelationshipOperations: UserRelationshipOperations,
};
async function fetchFriendRequestRelationshipOperations(
  viewer: Viewer,
  userIDs: string[],
): Promise<UserRelationshipOperationsResult> {
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

    const viewerBlockedTarget = relationships.some(
      relationship =>
        relationship.status === directedStatus.BLOCKED &&
        relationship.user1.toString() === viewer.userID,
    );
    const targetBlockedViewer = relationships.some(
      relationship =>
        relationship.status === directedStatus.BLOCKED &&
        relationship.user2.toString() === viewer.userID,
    );
    const friendshipExists = relationships.some(
      relationship => relationship.status === undirectedStatus.FRIEND,
    );
    const viewerRequestedTargetFriendship = relationships.some(
      relationship =>
        relationship.status === directedStatus.PENDING_FRIEND &&
        relationship.user1.toString() === viewer.userID,
    );
    const targetRequestedViewerFriendship = relationships.some(
      relationship =>
        relationship.status === directedStatus.PENDING_FRIEND &&
        relationship.user2.toString() === viewer.userID,
    );

    const operations = [];
    if (targetBlockedViewer) {
      if (viewerBlockedTarget) {
        operations.push('delete_directed');
      }
      const user_blocked = errors.user_blocked || [];
      errors.user_blocked = [...user_blocked, userID];
    } else if (friendshipExists) {
      const already_friends = errors.already_friends || [];
      errors.already_friends = [...already_friends, userID];
    } else if (targetRequestedViewerFriendship) {
      operations.push('friend', 'delete_directed');
    } else if (!viewerRequestedTargetFriendship) {
      operations.push('pending_friend');
    }
    userRelationshipOperations[userID] = operations;
  }

  for (const userID of userIDs) {
    if (!(userID in userRelationshipOperations)) {
      userRelationshipOperations[userID] = ['know_of', 'pending_friend'];
    }
  }

  return { errors, userRelationshipOperations };
}

export { fetchFriendRequestRelationshipOperations };
