// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import {
  type LegacyTraditionalRelationshipRequest,
  type RelationshipErrors,
  traditionalRelationshipActionsList,
  type LegacyRelationshipRequest,
  legacyFarcasterRelationshipRequestValidator,
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
  request: LegacyRelationshipRequest,
): Promise<RelationshipErrors> {
  return await updateRelationships(viewer, request);
}

export { legacyUpdateRelationshipsResponder };
