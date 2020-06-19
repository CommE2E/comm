// @flow

import type { RelationshipRequest } from '../types/relationship-types';
import type { FetchJSON } from '../utils/fetch-json';

const updateRelationshipActionTypes = Object.freeze({
  started: 'UPDATE_RELATIONSHIP_STARTED',
  success: 'UPDATE_RELATIONSHIP_SUCCESS',
  failed: 'UPDATE_RELATIONSHIP_FAILED',
});
async function updateRelationship(
  fetchJSON: FetchJSON,
  request: RelationshipRequest,
): Promise<void> {
  return await fetchJSON('update_relationship', request);
}

export { updateRelationshipActionTypes, updateRelationship };
