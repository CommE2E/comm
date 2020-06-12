// @flow

import type { RelationshipRequest } from 'lib/types/relationship-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { assertRelationshipStatus } from 'lib/types/relationship-types';
import { updateRelationship } from '../updaters/relationship-updaters';
import { validateInput, tShape, tNumEnum } from '../utils/validation-utils';

const updateRelationshipInputValidator = tShape({
  userID: t.String,
  status: tNumEnum(assertRelationshipStatus),
});

async function updateRelationshipResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: RelationshipRequest = input;
  await validateInput(viewer, updateRelationshipInputValidator, request);
  return await updateRelationship(viewer, request);
}

export { updateRelationshipResponder };
