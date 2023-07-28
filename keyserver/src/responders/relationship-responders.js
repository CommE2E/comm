// @flow

import t, { type TInterface } from 'tcomb';

import {
  type RelationshipRequest,
  type RelationshipErrors,
  relationshipActionsList,
} from 'lib/types/relationship-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import { updateRelationships } from '../updaters/relationship-updaters.js';

export const updateRelationshipInputValidator: TInterface<RelationshipRequest> =
  tShape<RelationshipRequest>({
    action: t.enums.of(relationshipActionsList, 'relationship action'),
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
  request: RelationshipRequest,
): Promise<RelationshipErrors> {
  return await updateRelationships(viewer, request);
}

export { updateRelationshipsResponder };
