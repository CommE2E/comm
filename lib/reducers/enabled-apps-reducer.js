// @flow

import {
  deleteAccountActionTypes,
  logOutActionTypes,
} from '../actions/user-actions.js';
import type { EnabledApps } from '../types/enabled-apps';
import { defaultEnabledApps } from '../types/enabled-apps';
import type { BaseAction } from '../types/redux-types';
import { setNewSessionActionType } from '../utils/action-utils.js';

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
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return defaultEnabledApps;
  }
  return state;
}
