// @flow

import type { LifecycleState } from '../types/lifecycle-state-types.js';
import type { BaseAction } from '../types/redux-types.js';

export const unsupervisedBackgroundActionType = 'UNSUPERVISED_BACKGROUND';
export const updateLifecycleStateActionType = 'UPDATE_LIFECYCLE_STATE';

export default function reduceLifecycleState(
  state: LifecycleState,
  action: BaseAction,
): LifecycleState {
  if (action.type === unsupervisedBackgroundActionType) {
    return 'background';
  } else if (action.type === updateLifecycleStateActionType) {
    return action.payload;
  }
  return state;
}
