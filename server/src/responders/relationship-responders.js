// @flow

import type { RelationshipRequest } from 'lib/types/relationship-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { relationshipActions } from 'lib/types/relationship-types';
import { updateRelationships } from '../updaters/relationship-updaters';
import { validateInput, tShape } from '../utils/validation-utils';

const updateRelationshipInputValidator = tShape({
  action: t.enums.of(relationshipActions, 'relationship action'),
  userIDs: t.list(t.String),
});

async function updateRelationshipsResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: RelationshipRequest = input;
  await validateInput(viewer, updateRelationshipInputValidator, request);
  return await updateRelationships(viewer, request);
}

export { updateRelationshipsResponder };
