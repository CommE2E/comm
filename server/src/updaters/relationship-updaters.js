// @flow

import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import {
  type RelationshipStatus,
  relationshipStatuses,
  type RelationshipRequest,
} from 'lib/types/relationship-types';
import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';

async function updateRelationship(
  viewer: Viewer,
  request: RelationshipRequest,
) {
  const { userID, status } = request;

  if (viewer.id === userID) {
    throw new ServerError('invalid_user');
  }

  const userQuery = SQL`SELECT 1 FROM users WHERE id = ${userID} LIMIT 1`;
  const [users] = await dbQuery(userQuery);

  if (!users.length) {
    throw new ServerError('user_does_not_exist');
  }

  // friend request
  if (status === relationshipStatuses.PENDING_FRIEND) {
    const [relationships] = await fetchRelationshipQuery(viewer.id, userID);

    if (!relationships.length) {
      await createRelationshipQuery(viewer.id, userID, status);
    } else {
      const [actorRelationship] = getRelationshipsForActorUser(
        relationships,
        viewer.id,
      );
      if (actorRelationship) {
        const message = actorFriendshipErrorMap[actorRelationship.status];
        throw new ServerError(message);
      }

      const [receiverRelationship] = getRelationshipsForReceiverUser(
        relationships,
        viewer.id,
      );
      if (receiverRelationship) {
        const message = receiverFriendshipErrorMap[receiverRelationship.status];
        throw new ServerError(message);
      }
    }
    // block action
  } else if (status === relationshipStatuses.BLOCKED) {
    const [relationships] = await fetchRelationshipQuery(viewer.id, userID);

    if (!relationships.length) {
      await createRelationshipQuery(viewer.id, userID, status);
    } else {
      const [actorRelationship] = getRelationshipsForActorUser(
        relationships,
        viewer.id,
      );
      if (actorRelationship) {
        if (isPendingFriendOrFriend(actorRelationship.status)) {
          const { user1, user2 } = actorRelationship;
          // cancels already sent friend request or removes friendship then blocks the user
          await updateRelationshipQuery(user1, user2, status);
        }

        if (actorRelationship.status === relationshipStatuses.BLOCKED) {
          throw new ServerError('user_already_blocked');
        }
      }

      const [receiverRelationship] = getRelationshipsForReceiverUser(
        relationships,
        viewer.id,
      );
      if (receiverRelationship) {
        if (isPendingFriendOrFriend(receiverRelationship.status)) {
          const { user1, user2 } = receiverRelationship;
          // cancels already received friend request or removes frienship then blocks user
          await deleteRelationshipQuery(user1, user2);
          await createRelationshipQuery(viewer.id, userID, status);
        }

        if (receiverRelationship.status === relationshipStatuses.BLOCKED) {
          // users blocked each other
          await createRelationshipQuery(viewer.id, userID, status);
        }
      }
    }
    // friend request acceptance
  } else if (status === relationshipStatuses.FRIEND) {
    const query = SQL`
      SELECT user1, user2, status
      FROM relationships
      WHERE user1 = ${userID} AND user2 = ${viewer.id} AND status = ${relationshipStatuses.PENDING_FRIEND}
    `;
    const [relationships] = await dbQuery(query);
    const [relationship] = relationships;

    if (relationship) {
      const { user1, user2 } = relationship;
      await updateRelationshipQuery(user1, user2, relationshipStatuses.FRIEND);
    } else {
      throw new ServerError('friend_request_does_not_exist');
    }
  } else if (status === relationshipStatuses.KNOW_OF) {
    invariant(false, `${status} is not currently supported`);
  } else {
    invariant(false, `invalid relationship status: ${status}`);
  }
}

async function fetchRelationshipQuery(
  firstUserID: string,
  secondUserID: string,
) {
  const query = SQL`
    SELECT user1, user2, status
    FROM relationships
    WHERE (user1 = ${firstUserID} AND user2 = ${secondUserID}) OR (user1 = ${secondUserID} AND user2 = ${firstUserID})
  `;
  return await dbQuery(query);
}

async function createRelationshipQuery(
  firstUserID: string,
  secondUserID: string,
  status: RelationshipStatus,
) {
  const row = [firstUserID, secondUserID, status];
  const query = SQL`
    INSERT INTO relationships(user1, user2, status)
    VALUES ${[row]}
  `;
  return await dbQuery(query);
}

async function deleteRelationshipQuery(
  firstUserID: string,
  secondUserID: string,
) {
  const query = SQL`
    DELETE FROM relationships
    WHERE user1 = ${firstUserID} and user2 = ${secondUserID}
`;
  return await dbQuery(query);
}

async function updateRelationshipQuery(
  firstUserID: string,
  secondUserID: string,
  status: RelationshipStatus,
) {
  const query = SQL`
    UPDATE relationships
    SET status = ${status}
    WHERE user1 = ${firstUserID} and user2 = ${secondUserID}
  `;
  return await dbQuery(query);
}

function getRelationshipsForActorUser(relationships, userID) {
  return relationships.filter(({ user1 }) => {
    return user1.toString() === userID;
  });
}

function getRelationshipsForReceiverUser(relationships, userID) {
  return relationships.filter(({ user2 }) => {
    return user2.toString() === userID;
  });
}

function isPendingFriendOrFriend(status) {
  return (
    status === relationshipStatuses.PENDING_FRIEND ||
    status === relationshipStatuses.FRIEND
  );
}

const actorFriendshipErrorMap = {
  [relationshipStatuses.PENDING_FRIEND]: 'invitation_already_sent_by_requester',
  [relationshipStatuses.FRIEND]: 'friendship_already_exists',
  [relationshipStatuses.BLOCKED]: 'user_blocked_by_requester',
};

const receiverFriendshipErrorMap = {
  [relationshipStatuses.PENDING_FRIEND]: 'invitation_already_sent_to_requester',
  [relationshipStatuses.FRIEND]: 'friendship_already_exists',
  [relationshipStatuses.BLOCKED]: 'requester_blocked_by_user',
};

export { updateRelationship };
