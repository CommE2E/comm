// @flow

import { setAccessTokenActionType } from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';

export default function reduceServicesAccessToken(
  state: ?string,
  action: BaseAction,
): ?string {
  if (action.type === setAccessTokenActionType) {
    return action.payload;
  }
  return state;
}
