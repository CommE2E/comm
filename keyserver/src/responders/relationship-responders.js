// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import {
  type TraditionalRelationshipRequest,
  type RelationshipErrors,
  traditionalRelationshipActionsList,
  type RelationshipRequest,
  farcasterRelationshipRequestValidator,
} from 'lib/types/relationship-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import { updateRelationships } from '../updaters/relationship-updaters.js';

export const traditionalRelationshipRequestValidator: TInterface<TraditionalRelationshipRequest> =
  tShape<TraditionalRelationshipRequest>({
    action: t.enums.of(
      traditionalRelationshipActionsList,
      'relationship action',
    ),
    userIDs: t.list(t.String),
  });

export const updateRelationshipInputValidator: TUnion<RelationshipRequest> =
  t.union([
    traditionalRelationshipRequestValidator,
    farcasterRelationshipRequestValidator,
  ]);

async function updateRelationshipsResponder(
  viewer: Viewer,
  request: RelationshipRequest,
): Promise<RelationshipErrors> {
  return await updateRelationships(viewer, request);
}

export { updateRelationshipsResponder };
