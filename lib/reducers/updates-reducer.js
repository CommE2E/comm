// @flow

import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import { logInActionTypes } from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import { processUpdatesActionType } from '../types/update-types.js';

function reduceUpdatesCurrentAsOf(
  currentAsOf: number,
  action: BaseAction,
): number {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success
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
