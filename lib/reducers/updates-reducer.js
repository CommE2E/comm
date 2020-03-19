// @flow

import type { BaseAction } from '../types/redux-types';
import { processUpdatesActionType } from '../types/update-types';

import _difference from 'lodash/fp/difference';

import {
  logInActionTypes,
  resetPasswordActionTypes,
} from '../actions/user-actions';
import threadWatcher from '../shared/thread-watcher';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
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
  } else if (action.type === fullStateSyncActionType) {
    return action.payload.updatesCurrentAsOf;
  } else if (action.type === incrementalStateSyncActionType) {
    return action.payload.updatesResult.currentAsOf;
  } else if (action.type === processUpdatesActionType) {
    return Math.max(action.payload.updatesResult.currentAsOf, currentAsOf);
  }
  return currentAsOf;
}

export default reduceUpdatesCurrentAsOf;
