// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import {
  type LegacyTraditionalRelationshipRequest,
  type RelationshipErrors,
  traditionalRelationshipActionsList,
  type LegacyRelationshipRequest,
  legacyFarcasterRelationshipRequestValidator,
  relationshipActions,
  type RelationshipRequestUserInfo,
  type RelationshipRequestWithRobotext,
  type RelationshipRequestWithoutRobotext,
  type RelationshipRequest,
} from 'lib/types/relationship-types.js';
import { tShape, tUserID } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import { updateRelationships } from '../updaters/relationship-updaters.js';

const legacyTraditionalRelationshipRequestValidator: TInterface<LegacyTraditionalRelationshipRequest> =
  tShape<LegacyTraditionalRelationshipRequest>({
    action: t.enums.of(
      traditionalRelationshipActionsList,
      'relationship action',
    ),
    userIDs: t.list(tUserID),
  });

export const legacyUpdateRelationshipInputValidator: TUnion<LegacyRelationshipRequest> =
  t.union([
    legacyTraditionalRelationshipRequestValidator,
    legacyFarcasterRelationshipRequestValidator,
  ]);

async function legacyUpdateRelationshipsResponder(
  viewer: Viewer,
  legacyRequest: LegacyRelationshipRequest,
): Promise<RelationshipErrors> {
  let requestUserIDs;
  const viewerID = viewer.userID;
  if (legacyRequest.action === relationshipActions.FARCASTER_MUTUAL) {
    requestUserIDs = Object.keys(legacyRequest.userIDsToFID).filter(
      userID => userID !== viewerID,
    );
  } else {
    requestUserIDs = legacyRequest.userIDs;
  }

  const requestUserInfos: { [userID: string]: RelationshipRequestUserInfo } =
    {};
  for (const userID of requestUserIDs) {
    requestUserInfos[userID] = {
      createRobotextInThinThread: true,
    };
  }
  const { action } = legacyRequest;
  let request: RelationshipRequest;
  if (action === 'farcaster' || action === 'friend') {
    request = { action, users: requestUserInfos };
  } else {
    request = { action, users: requestUserInfos };
  }
  return await updateRelationships(viewer, request);
}

export const updateRelationshipInputValidator: TUnion<RelationshipRequest> =
  t.union([
    tShape<RelationshipRequestWithRobotext>({
      action: t.enums.of(['farcaster', 'friend'], 'relationship action'),
      users: t.dict(
        tUserID,
        tShape<RelationshipRequestUserInfo>({
          createRobotextInThinThread: t.Boolean,
        }),
      ),
    }),
    tShape<RelationshipRequestWithoutRobotext>({
      action: t.enums.of(
        ['unfriend', 'block', 'unblock', 'acknowledge'],
        'relationship action',
      ),
      users: t.dict(
        tUserID,
        tShape<RelationshipRequestUserInfo>({
          createRobotextInThinThread: t.maybe(t.Boolean),
        }),
      ),
    }),
  ]);

async function updateRelationshipsResponder(
  viewer: Viewer,
  request: RelationshipRequest,
): Promise<RelationshipErrors> {
  return await updateRelationships(viewer, request);
}

export { legacyUpdateRelationshipsResponder, updateRelationshipsResponder };
