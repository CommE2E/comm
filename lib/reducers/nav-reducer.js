// @flow

import { updateCalendarQueryActionTypes } from '../actions/entry-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  identityRegisterActionTypes,
  logInActionTypes,
  keyserverRegisterActionTypes,
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions.js';
import { defaultCalendarQuery } from '../types/entry-types.js';
import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import { getConfig } from '../utils/config.js';

export default function reduceBaseNavInfo<T: BaseNavInfo>(
  state: T,
  action: BaseAction,
): T {
  if (
    action.type === logInActionTypes.started ||
    action.type === siweAuthActionTypes.started ||
    action.type === keyserverRegisterActionTypes.started ||
    action.type === fullStateSyncActionType ||
    action.type === incrementalStateSyncActionType
  ) {
    const { startDate, endDate } = action.payload.calendarQuery;
    return { ...state, startDate, endDate };
  } else if (action.type === updateCalendarQueryActionTypes.started) {
    if (action.payload && action.payload.calendarQuery) {
      const { startDate, endDate } = action.payload.calendarQuery;
      return { ...state, startDate, endDate };
    }
  } else if (
    action.type === updateCalendarQueryActionTypes.success &&
    !action.payload.calendarQueryAlreadyUpdated
  ) {
    const { startDate, endDate } = action.payload.calendarQuery;
    return { ...state, startDate, endDate };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    action.type === identityRegisterActionTypes.success
  ) {
    const { startDate, endDate } = defaultCalendarQuery(
      getConfig().platformDetails.platform,
    );

    return { ...state, startDate, endDate };
  }
  return state;
}
