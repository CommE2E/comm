// @flow

import type { BaseAction } from '../types/redux-types';

export const updateCrashReportsEnabledActionType =
  'UPDATE_CRASH_REPORTS_ENABLED';

export default function reduceCrashReportsEnabled(
  state: boolean,
  action: BaseAction,
): boolean {
  if (action.type === updateCrashReportsEnabledActionType) {
    return action.payload;
  }
  return state;
}
