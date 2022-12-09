// @flow
import { logInActionTypes, siweActionTypes } from '../actions/user-actions';
import type { BaseAction } from '../types/redux-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';
import { processUpdatesActionType } from '../types/update-types';

function reduceUpdatesCurrentAsOf(
  currentAsOf: number,
  action: BaseAction,
): number {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweActionTypes.success
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
