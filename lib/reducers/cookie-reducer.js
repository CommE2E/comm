// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';

export default function reduceCookie(state: ?string, action: BaseAction) {
  // If the cookie is undefined, that means we're deferring to the environment
  // to handle cookies. See comment in fetch-json.js.
  if (state === undefined) {
    return state;
  }
  if (action.type === "SET_COOKIE") {
    return action.payload.cookie;
  }
  return state;
}
