// @flow

import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import {
  type RelationshipStatus,
  relationshipStatuses,
  type RelationshipRequest,
} from 'lib/types/relationship-types';
import { ServerError } from 'lib/utils/errors';

import { fetchUserInfos } from '../fetchers/user-fetchers';
import { fetchRelationship } from '../fetchers/relationship-fetchers';
import { createRelationship } from '../creators/relationship-creator';
import { deleteRelationship } from '../deleters/relationship-deleters';
import { dbQuery, SQL } from '../database';

async function updateRelationship(
  viewer: Viewer,
  request: RelationshipRequest,
) {
  const { userID, status } = request;

  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  if (viewer.userID === userID) {
    throw new ServerError('invalid_user');
  }

  const users = await fetchUserInfos([userID]);
  if (!users[userID].username) {
    throw new ServerError('user_does_not_exist');
  }

  if (status === relationshipStatuses.PENDING_FRIEND) {
    const [relationships] = await fetchRelationship(viewer.userID, userID);

    if (!relationships.length) {
      await createRelationship(viewer.userID, userID, status);
    } else {
      const [actorRelationship] = getRelationshipsForActorUser(
        relationships,
        viewer.userID,
      );
      if (actorRelationship) {
        const message = actorFriendshipErrorMap[actorRelationship.status];
        throw new ServerError(message);
      }

      const [receiverRelationship] = getRelationshipsForReceiverUser(
        relationships,
        viewer.userID,
      );
      if (receiverRelationship) {
        const message = receiverFriendshipErrorMap[receiverRelationship.status];
        throw new ServerError(message);
      }
    }
  } else if (status === relationshipStatuses.BLOCKED) {
    const [relationships] = await fetchRelationship(viewer.userID, userID);

    if (!relationships.length) {
      await createRelationship(viewer.userID, userID, status);
    } else {
      const [actorRelationship] = getRelationshipsForActorUser(
        relationships,
        viewer.userID,
      );
      if (actorRelationship) {
        if (
          actorRelationship.status === relationshipStatuses.PENDING_FRIEND ||
          actorRelationship.status === relationshipStatuses.FRIEND
        ) {
          const { user1, user2 } = actorRelationship;
          await updateRelationshipQuery(user1, user2, status);
        }

        if (actorRelationship.status === relationshipStatuses.BLOCKED) {
          return;
        }
      }

      const [receiverRelationship] = getRelationshipsForReceiverUser(
        relationships,
        viewer.userID,
      );
      if (receiverRelationship) {
        if (
          receiverRelationship.status === relationshipStatuses.PENDING_FRIEND ||
          receiverRelationship.status === relationshipStatuses.FRIEND
        ) {
          const { user1, user2 } = receiverRelationship;
          await deleteRelationship(user1, user2);
          await createRelationship(viewer.userID, userID, status);
        }

        if (receiverRelationship.status === relationshipStatuses.BLOCKED) {
          await createRelationship(viewer.userID, userID, status);
        }
      }
    }
  } else if (status === relationshipStatuses.FRIEND) {
    const [relationships] = await fetchRelationship(viewer.userID, userID);
    const [relationship] = relationships.filter(
      r =>
        r.user1 === userID &&
        r.user2 === viewer.userID &&
        r.status === relationshipStatuses.PENDING_FRIEND,
    );

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

async function updateRelationshipQuery(
  firstUserID: string,
  secondUserID: string,
  status: RelationshipStatus,
) {
  const query = SQL`
    UPDATE relationships
    SET status = ${status}
    WHERE user1 = ${firstUserID} AND user2 = ${secondUserID}
  `;
  await dbQuery(query);
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
