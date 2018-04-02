// @flow

import type { BaseAction } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';

import { dateFromString } from '../utils/date-utils';
import {
  fetchEntriesAndSetRangeActionTypes,
  fetchEntriesAndAppendRangeActionTypes,
} from '../actions/entry-actions';
import {
  logInActionTypes,
  resetPasswordActionTypes,
} from '../actions/user-actions';
import { pingActionTypes } from '../actions/ping-actions';

export default function reduceBaseNavInfo<T: BaseNavInfo>(
  state: T,
  action: BaseAction,
): T {
  if (action.type === fetchEntriesAndSetRangeActionTypes.success) {
    const home = action.payload.calendarQuery.navID === 'home';
    return {
      ...state,
      home,
      threadID: home ? null : action.payload.calendarQuery.navID,
      startDate: action.payload.calendarQuery.startDate,
      endDate: action.payload.calendarQuery.endDate,
    };
  } else if (action.type === fetchEntriesAndAppendRangeActionTypes.success) {
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
    action.type === logInActionTypes.started ||
      action.type === resetPasswordActionTypes.started ||
      action.type === pingActionTypes.started
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
