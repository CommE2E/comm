// @flow

import type { BaseAction } from '../types/redux-types';

export const unsupervisedBackgroundActionType = 'UNSUPERVISED_BACKGROUND';
export const updateLifecycleStateActionType = 'UPDATE_LIFECYCLE_STATE';

export default function reduceLifecycleState(
  state: boolean,
  action: BaseAction,
): boolean {
  if (action.type === unsupervisedBackgroundActionType) {
    return false;
  } else if (action.type === updateLifecycleStateActionType) {
    if (action.payload === 'active') {
      return true;
    } else if (action.payload === 'background') {
      return false;
    }
  }
  return state;
}
