// @flow

import type { ServerRequest } from '../types/request-types';
import type { BaseAction } from '../types/redux-types';

import { pingActionTypes } from '../actions/ping-actions';

export default function reduceServerRequests(
  state: $ReadOnlyArray<ServerRequest>,
  action: BaseAction,
): $ReadOnlyArray<ServerRequest> {
  if (action.type === pingActionTypes.success) {
    const { requests } = action.payload;
    return [
      // For now, we assume that each ping responds to every server request
      // present at the time. Note that we're relying on reference comparisons.
      ...state.filter(
        request => !requests.deliveredClientResponses.includes(request),
      ),
      ...requests.serverRequests,
    ];
  }
  return state;
}
