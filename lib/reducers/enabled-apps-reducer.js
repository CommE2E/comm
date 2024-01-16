// @flow

import {
  deleteAccountActionTypes,
  logOutActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { EnabledApps } from '../types/enabled-apps.js';
import {
  defaultEnabledApps,
  defaultWebEnabledApps,
} from '../types/enabled-apps.js';
import type { BaseAction } from '../types/redux-types.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

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
    action.type === deleteAccountActionTypes.success
  ) {
    return process.env.BROWSER ? defaultWebEnabledApps : defaultEnabledApps;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    !usingCommServicesAccessToken
  ) {
    return process.env.BROWSER ? defaultWebEnabledApps : defaultEnabledApps;
  }
  return state;
}
