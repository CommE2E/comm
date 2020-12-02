// @flow

import {
  type RelationshipRequest,
  type RelationshipErrors,
  relationshipActionsList,
} from 'lib/types/relationship-types';
import t from 'tcomb';

import type { Viewer } from '../session/viewer';
import { updateRelationships } from '../updaters/relationship-updaters';
import { validateInput, tShape } from '../utils/validation-utils';

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
