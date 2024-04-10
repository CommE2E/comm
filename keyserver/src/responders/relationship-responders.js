// @flow

import t, { type TInterface } from 'tcomb';

import {
  type TraditionalRelationshipRequest,
  type RelationshipErrors,
  traditionalRelationshipActionsList,
} from 'lib/types/relationship-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import { updateRelationships } from '../updaters/relationship-updaters.js';

export const updateRelationshipInputValidator: TInterface<TraditionalRelationshipRequest> =
  tShape<TraditionalRelationshipRequest>({
    action: t.enums.of(
      traditionalRelationshipActionsList,
      'relationship action',
    ),
    userIDs: t.list(t.String),
  });

export const relationshipErrorsValidator: TInterface<RelationshipErrors> =
  tShape<RelationshipErrors>({
    invalid_user: t.maybe(t.list(t.String)),
    already_friends: t.maybe(t.list(t.String)),
    user_blocked: t.maybe(t.list(t.String)),
  });

async function updateRelationshipsResponder(
  viewer: Viewer,
  request: TraditionalRelationshipRequest,
): Promise<RelationshipErrors> {
  return await updateRelationships(viewer, request);
}

export { updateRelationshipsResponder };
