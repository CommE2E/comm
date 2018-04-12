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
    action.payload.serverRequests
  ) {
    return [
      ...state,
      ...action.payload.serverRequests,
    ];
  } else if (action.type === pingActionTypes.started && state.length > 0) {
    // For now, we assume that each ping responds to every server request
    // present at the time
    return [];
  }
  return state;
}
