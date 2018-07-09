// @flow

import type { ServerRequest } from '../types/request-types';
import type { BaseAction } from '../types/redux-types';

import { pingActionTypes } from '../actions/ping-actions';

export default function reduceServerRequests(
  state: $ReadOnlyArray<ServerRequest>,
  action: BaseAction,
): $ReadOnlyArray<ServerRequest> {
  if (
    action.type === pingActionTypes.success &&
    action.payload.requests.serverRequests.length > 0
  ) {
    return [
      ...state,
      ...action.payload.requests.serverRequests,
    ];
  } else if (action.type === pingActionTypes.started && state.length > 0) {
    // For now, we assume that each ping responds to every server request
    // present at the time. The result of the ping will include all server
    // requests that weren't responded to, so it's safe to clear them here.
    return [];
  }
  return state;
}
