// @flow

import type { BaseAction } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';

export default function reduceBaseNavInfo(
  state: BaseNavInfo,
  action: BaseAction,
) {
  if (
    action.type === "NEW_CALENDAR_SUCCESS" ||
      action.type === "AUTH_CALENDAR_SUCCESS"
  ) {
    return {
      ...state,
      home: false,
      calendarID: action.payload.id,
    };
  } else if (action.type === "FETCH_ENTRIES_AND_SET_RANGE_SUCCESS") {
    const home = action.payload.calendarQuery.navID === 'home';
    return {
      ...state,
      home,
      calendarID: home ? null : action.payload.calendarQuery.navID,
      startDate: action.payload.calendarQuery.startDate,
      endDate: action.payload.calendarQuery.endDate,
    };
  } else if (
    action.type === "LOG_IN_STARTED" ||
      action.type === "RESET_PASSWORD_STARTED" ||
      action.type === "PING_STARTED"
  ) {
    const calendarQuery = action.payload && action.payload.calendarQuery;
    if (calendarQuery) {
      const home = calendarQuery.navID === 'home';
      return {
        ...state,
        home,
        calendarID: home ? null : calendarQuery.navID,
        startDate: calendarQuery.startDate,
        endDate: calendarQuery.endDate,
      };
    }
  }
  return state;
}
