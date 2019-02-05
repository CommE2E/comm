// @flow

import type { BaseAction } from '../types/redux-types';

export const backgroundActionType = "BACKGROUND";
export const foregroundActionType = "FOREGROUND";
export const unsupervisedBackgroundActionType = "UNSUPERVISED_BACKGROUND";

export default function reduceForeground(
  state: bool,
  action: BaseAction,
): bool {
  if (
    action.type === backgroundActionType ||
    action.type === unsupervisedBackgroundActionType
  ) {
    return false;
  } else if (action.type === foregroundActionType) {
    return true;
  }
  return state;
}
