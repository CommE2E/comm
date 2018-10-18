// @flow

import type { BaseAction } from '../types/redux-types';

import _difference from 'lodash/fp/difference';

import {
  logInActionTypes,
  resetPasswordActionTypes,
} from '../actions/user-actions';
import threadWatcher from '../shared/thread-watcher';
import {
  fullStateSyncActionPayload,
  incrementalStateSyncActionPayload,
} from '../types/socket-types';

function reduceUpdatesCurrentAsOf(
  currentAsOf: number,
  action: BaseAction,
): number {
  if (
    action.type === logInActionTypes.success ||
    action.type === resetPasswordActionTypes.success
  ) {
    return action.payload.updatesCurrentAsOf;
  } else if (action.type === fullStateSyncActionPayload) {
    return action.payload.updatesCurrentAsOf;
  } else if (action.type === incrementalStateSyncActionPayload) {
    return action.payload.updatesResult.currentAsOf;
  }
  return currentAsOf;
}

export default reduceUpdatesCurrentAsOf;
