// @flow

import {
  identityLogInActionTypes,
  identityRegisterActionTypes,
  restoreUserActionTypes,
} from 'lib/actions/user-actions.js';

import type { Action } from './redux-setup.js';

function reduceServicesAccessToken(state: ?string, action: Action): ?string {
  if (
    action.type === identityLogInActionTypes.success ||
    action.type === restoreUserActionTypes.success ||
    action.type === identityRegisterActionTypes.success
  ) {
    return action.payload.accessToken;
  }
  return state;
}

export { reduceServicesAccessToken };
