// @flow

import type { EnabledApps } from '../types/enabled-apps';
import type { BaseAction } from '../types/redux-types';

export const enableAppActionType = 'ENABLE_APP';
export const disableAppActionType = 'DISABLE_APP';

export default function reduceEnabledApps(
  state: EnabledApps,
  action: BaseAction,
): EnabledApps {
  if (action.type === enableAppActionType && action.payload === 'calendar') {
    return { ...state, calendar: true };
  } else if (
    action.type === disableAppActionType &&
    action.payload === 'calendar'
  ) {
    return { ...state, calendar: false };
  }
  return state;
}
