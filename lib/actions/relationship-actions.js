// @flow

import type { CallSingleKeyserverEndpoint } from '../keyserver-conn/call-single-keyserver-endpoint.js';
import type {
  RelationshipErrors,
  RelationshipRequest,
} from '../types/relationship-types.js';
import { ServerError } from '../utils/errors.js';

const updateRelationshipsActionTypes = Object.freeze({
  started: 'UPDATE_RELATIONSHIPS_STARTED',
  success: 'UPDATE_RELATIONSHIPS_SUCCESS',
  failed: 'UPDATE_RELATIONSHIPS_FAILED',
});
const updateRelationships =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((request: RelationshipRequest) => Promise<RelationshipErrors>) =>
  async request => {
    const errors = await callSingleKeyserverEndpoint(
      'update_relationships2',
      request,
    );

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
