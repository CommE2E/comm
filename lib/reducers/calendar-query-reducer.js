// @flow

import { updateCalendarQueryActionTypes } from '../actions/entry-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
  registerActionTypes,
} from '../actions/user-actions.js';
import { defaultCalendarQuery } from '../types/entry-types.js';
import type { CalendarQuery } from '../types/entry-types.js';
import { type BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { getConfig } from '../utils/config.js';

function reduceCalendarQuery(
  state: CalendarQuery,
  action: BaseAction,
): CalendarQuery {
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return defaultCalendarQuery(getConfig().platformDetails.platform);
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success
  ) {
    return action.payload.calendarResult.calendarQuery;
  } else if (
    action.type === registerActionTypes.success ||
    action.type === updateCalendarQueryActionTypes.success ||
    action.type === fullStateSyncActionType ||
    action.type === incrementalStateSyncActionType
  ) {
    return action.payload.calendarQuery;
  }

  return state;
}

export { reduceCalendarQuery };
