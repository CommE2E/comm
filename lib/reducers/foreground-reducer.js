// @flow

import type { BaseAction } from '../types/redux-types';

export const backgroundActionType = "BACKGROUND";
export const foregroundActionType = "FOREGROUND";

export default function reduceForeground(
  state: bool,
  action: BaseAction,
): bool {
  if (action.type === backgroundActionType) {
    return false;
  } else if (action.type === foregroundActionType) {
    return true;
  }
  return state;
}
