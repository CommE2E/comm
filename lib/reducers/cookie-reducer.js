// @flow

import type { BaseAction } from '../types/redux-types';

import { setCookieActionType } from '../utils/action-utils';

export default function reduceCookie(state: ?string, action: BaseAction) {
  // If the cookie is undefined, that means we're deferring to the environment
  // to handle cookies. See comment in fetch-json.js.
  if (state === undefined) {
    return state;
  }
  if (action.type === setCookieActionType) {
    return action.payload.cookie;
  }
  return state;
}
