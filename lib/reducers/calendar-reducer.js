// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { CalendarInfo } from '../types/calendar-types';

import invariant from 'invariant';
import _ from 'lodash';

export default function reduceCalendarInfos<T: BaseAppState>(
  state: {[id: string]: CalendarInfo},
  action: BaseAction<T>,
): {[id: string]: CalendarInfo} {
  if (
    action.type === "LOG_OUT_SUCCESS" ||
      action.type === "DELETE_ACCOUNT_SUCCESS"
  ) {
    return action.payload;
  } else if (action.type === "LOG_IN_SUCCESS") {
    return action.payload.calendarInfos;
  } else if (action.type === "RESET_PASSWORD_SUCCESS") {
    return action.payload.calendarInfos;
  } else if (
    action.type === "CHANGE_CALENDAR_SETTINGS_SUCCESS" ||
      action.type === "NEW_CALENDAR_SUCCESS"
  ) {
    return {
      ...state,
      [action.payload.id]: action.payload,
    };
  } else if (action.type === "DELETE_CALENDAR_SUCCESS") {
    const calendarID = action.payload;
    return _.omitBy(state, (candidate) => candidate.id === calendarID);
  }
  return state;
}
