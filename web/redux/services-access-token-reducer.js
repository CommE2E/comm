// @flow

import {
  identityLogInActionTypes,
  identityRegisterActionTypes,
} from 'lib/actions/user-actions.js';

import type { Action } from './redux-setup.js';

export default function reduceServicesAccessToken(
  state: ?string,
  action: Action,
): ?string {
  if (
    action.type === identityLogInActionTypes.success ||
    action.type === identityRegisterActionTypes.success
  ) {
    return action.payload.accessToken;
  }
  return state;
}
