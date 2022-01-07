// @flow

import t from 'tcomb';

import {
  type RelationshipRequest,
  type RelationshipErrors,
  relationshipActionsList,
  relationshipErrorsValidator,
} from 'lib/types/relationship-types';
import { tShape } from 'lib/utils/validation-utils';

import type { Viewer } from '../session/viewer';
import { updateRelationships } from '../updaters/relationship-updaters';
import {
  validateInput,
  validateAndConvertOutput,
} from '../utils/validation-utils';

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
  const response = await updateRelationships(viewer, request);
  return validateAndConvertOutput(
    viewer,
    relationshipErrorsValidator,
    response,
  );
}

export { updateRelationshipsResponder };
