// @flow

import type {
  RelationshipRequest,
  RelationshipErrors,
} from '../types/relationship-types';
import { ServerError } from '../utils/errors';
import type { FetchJSON } from '../utils/fetch-json';

const updateRelationshipsActionTypes = Object.freeze({
  started: 'UPDATE_RELATIONSHIPS_STARTED',
  success: 'UPDATE_RELATIONSHIPS_SUCCESS',
  failed: 'UPDATE_RELATIONSHIPS_FAILED',
});
const updateRelationships = (fetchJSON: FetchJSON): (
  request: RelationshipRequest,
) => Promise<RelationshipErrors> => async (
  request
) => {
  const errors = await fetchJSON('update_relationships', request);

  const { invalid_user, already_friends, user_blocked } = errors;
  if (invalid_user) {
    throw new ServerError('invalid_user', errors);
  } else if (already_friends) {
    throw new ServerError('already_friends', errors);
  } else if (user_blocked) {
    throw new ServerError('user_blocked', errors);
  }

  return errors;
};

export { updateRelationshipsActionTypes, updateRelationships };
