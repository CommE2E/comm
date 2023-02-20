// @flow

import type {
  RelationshipRequest,
  RelationshipErrors,
} from '../types/relationship-types.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import { ServerError } from '../utils/errors.js';

const updateRelationshipsActionTypes = Object.freeze({
  started: 'UPDATE_RELATIONSHIPS_STARTED',
  success: 'UPDATE_RELATIONSHIPS_SUCCESS',
  failed: 'UPDATE_RELATIONSHIPS_FAILED',
});
const updateRelationships =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((request: RelationshipRequest) => Promise<RelationshipErrors>) =>
  async request => {
    const errors = await callServerEndpoint('update_relationships', request);

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
