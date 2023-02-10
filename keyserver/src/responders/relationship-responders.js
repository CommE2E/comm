// @flow

import t from 'tcomb';

import {
  type RelationshipRequest,
  type RelationshipErrors,
  relationshipActionsList,
} from 'lib/types/relationship-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import type { Viewer } from '../session/viewer.js';
import { updateRelationships } from '../updaters/relationship-updaters.js';
import { validateInput } from '../utils/validation-utils.js';

const updateRelationshipInputValidator = tShape({
  action: t.enums.of(relationshipActionsList, 'relationship action'),
  userIDs: t.list(t.String),
});

async function updateRelationshipsResponder(
  viewer: Viewer,
  input: any,
): Promise<RelationshipErrors> {
  const request: RelationshipRequest = input;
  await validateInput(viewer, updateRelationshipInputValidator, request);
  return await updateRelationships(viewer, request);
}

export { updateRelationshipsResponder };
