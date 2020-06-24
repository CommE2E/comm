// @flow

import type { RelationshipRequest } from '../types/relationship-types';
import type { FetchJSON } from '../utils/fetch-json';

const updateRelationshipsActionTypes = Object.freeze({
  started: 'UPDATE_RELATIONSHIPS_STARTED',
  success: 'UPDATE_RELATIONSHIPS_SUCCESS',
  failed: 'UPDATE_RELATIONSHIPS_FAILED',
});
async function updateRelationships(
  fetchJSON: FetchJSON,
  request: RelationshipRequest,
): Promise<void> {
  return await fetchJSON('update_relationships', request);
}

export { updateRelationshipsActionTypes, updateRelationships };
