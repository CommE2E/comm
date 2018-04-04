// @flow

import type { BaseAction } from '../types/redux-types';

import _difference from 'lodash/fp/difference';

import {
  logInActionTypes,
  resetPasswordActionTypes,
} from '../actions/user-actions';
import { pingActionTypes } from '../actions/ping-actions';
import threadWatcher from '../shared/thread-watcher';

function reduceUpdatesCurrentAsOf(
  currentAsOf: number,
  action: BaseAction,
): number {
  if (
    action.type !== logInActionTypes.success &&
      action.type !== resetPasswordActionTypes.success &&
      action.type !== pingActionTypes.success
  ) {
    return currentAsOf;
  }
  return action.payload.updatesResult.currentAsOf;
}

export default reduceUpdatesCurrentAsOf;
