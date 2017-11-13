// @flow

import type { BaseAction } from '../types/redux-types';

import {
  logInActionTypes,
  resetPasswordActionTypes,
} from '../actions/user-actions';
import { pingActionTypes } from '../actions/ping-actions';

function reduceCurrentAsOf(
  currentAsOf: number,
  action: BaseAction,
): number {
  if (
    action.type === logInActionTypes.success ||
      action.type === resetPasswordActionTypes.success ||
      action.type === pingActionTypes.success
  ) {
    return action.payload.messagesResult.serverTime;
  }
  return currentAsOf;
}

export default reduceCurrentAsOf;
