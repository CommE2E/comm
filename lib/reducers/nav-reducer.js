// @flow

import type { BaseAction } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';

import { dateFromString } from '../utils/date-utils';

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
      threadID: action.payload.id,
    };
  } else if (action.type === "FETCH_ENTRIES_AND_SET_RANGE_SUCCESS") {
    const home = action.payload.calendarQuery.navID === 'home';
    return {
      ...state,
      home,
      threadID: home ? null : action.payload.calendarQuery.navID,
      startDate: action.payload.calendarQuery.startDate,
      endDate: action.payload.calendarQuery.endDate,
    };
  } else if (action.type === "FETCH_ENTRIES_AND_APPEND_RANGE_SUCCESS") {
    const queryStartDate =
      dateFromString(action.payload.calendarQuery.startDate);
    const reduxStartDate = dateFromString(state.startDate);
    const queryEndDate = dateFromString(action.payload.calendarQuery.endDate);
    const reduxEndDate = dateFromString(state.endDate);
    const startDate = queryStartDate > reduxStartDate
      ? state.startDate
      : action.payload.calendarQuery.startDate;
    const endDate = queryEndDate > reduxEndDate
      ? action.payload.calendarQuery.endDate
      : state.endDate;
    return {
      ...state,
      startDate,
      endDate,
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
        threadID: home ? null : calendarQuery.navID,
        startDate: calendarQuery.startDate,
        endDate: calendarQuery.endDate,
      };
    }
  }
  return state;
}
