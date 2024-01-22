// @flow

import { removeKeyserverThreadIDsFromFilterList } from './calendar-filters-reducer.js';
import { updateCalendarQueryActionTypes } from '../actions/entry-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logOutActionTypes,
  deleteKeyserverAccountActionTypes,
  logInActionTypes,
  keyserverRegisterActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import { defaultCalendarQuery } from '../types/entry-types.js';
import type { CalendarQuery } from '../types/entry-types.js';
import { type BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import { getConfig } from '../utils/config.js';

function reduceCalendarQuery(
  state: CalendarQuery,
  action: BaseAction,
): CalendarQuery {
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    return defaultCalendarQuery(getConfig().platformDetails.platform);
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated
  ) {
    return {
      ...state,
      filters: removeKeyserverThreadIDsFromFilterList(state.filters, [
        action.payload.keyserverID,
      ]),
    };
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    return {
      ...state,
      filters: removeKeyserverThreadIDsFromFilterList(
        state.filters,
        action.payload.keyserverIDs,
      ),
    };
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success
  ) {
    return action.payload.calendarResult.calendarQuery;
  } else if (
    action.type === keyserverRegisterActionTypes.success ||
    action.type === updateCalendarQueryActionTypes.success ||
    action.type === fullStateSyncActionType ||
    action.type === incrementalStateSyncActionType
  ) {
    return action.payload.calendarQuery;
  }

  return state;
}

export { reduceCalendarQuery };
