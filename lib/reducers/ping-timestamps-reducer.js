// @flow

import type { PingTimestamps } from '../types/ping-types';
import type { BaseAction } from '../types/redux-types';

import { pingActionTypes } from '../actions/ping-actions';

export default function reducePingTimestamps(
  state: PingTimestamps,
  action: BaseAction,
): PingTimestamps {
  if (action.type === pingActionTypes.success) {
    const now = Date.now();
    return {
      lastStarted: state.lastStarted,
      lastSuccess: now,
      lastCompletion: now,
    };
  } else if (action.type === pingActionTypes.failed) {
    return {
      lastStarted: state.lastStarted,
      lastSuccess: state.lastSuccess,
      lastCompletion: Date.now(),
    };
  } else if (action.type === pingActionTypes.started) {
    return {
      lastStarted: Date.now(),
      lastSuccess: state.lastSuccess,
      lastCompletion: state.lastCompletion,
    };
  }
  return state;
}

