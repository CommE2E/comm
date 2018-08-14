// @flow

import type { BaseAction } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';

import { dateFromString } from '../utils/date-utils';
import {
  updateCalendarQueryActionTypes,
  fetchEntriesAndAppendRangeActionTypes,
} from '../actions/entry-actions';
import {
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
} from '../actions/user-actions';
import { pingActionTypes } from '../actions/ping-actions';

export default function reduceBaseNavInfo<T: BaseNavInfo>(
  state: T,
  action: BaseAction,
): T {
  if (action.type === fetchEntriesAndAppendRangeActionTypes.success) {
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
    action.type === registerActionTypes.started ||
    action.type === pingActionTypes.started
  ) {
    const { startDate, endDate } = action.payload.calendarQuery;
    return { ...state, startDate, endDate };
  } else if (
    (action.type === updateCalendarQueryActionTypes.started ||
      action.type === updateCalendarQueryActionTypes.success) &&
    action.payload &&
    action.payload.calendarQuery
  ) {
    const { startDate, endDate } = action.payload.calendarQuery;
    return { ...state, startDate, endDate };
  }
  return state;
}
