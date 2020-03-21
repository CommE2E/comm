// @flow

import type { BaseAction } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';

import { updateCalendarQueryActionTypes } from '../actions/entry-actions';
import {
  logInActionTypes,
  resetPasswordActionTypes,
  registerActionTypes,
} from '../actions/user-actions';

export default function reduceBaseNavInfo<T: BaseNavInfo>(
  state: T,
  action: BaseAction,
): T {
  if (
    action.type === logInActionTypes.started ||
    action.type === resetPasswordActionTypes.started ||
    action.type === registerActionTypes.started ||
    action.type === fullStateSyncActionType ||
    action.type === incrementalStateSyncActionType
  ) {
    const { startDate, endDate } = action.payload.calendarQuery;
    return { ...state, startDate, endDate };
  } else if (
    action.type === updateCalendarQueryActionTypes.started &&
    action.payload &&
    action.payload.calendarQuery
  ) {
    const { startDate, endDate } = action.payload.calendarQuery;
    return { ...state, startDate, endDate };
  } else if (
    action.type === updateCalendarQueryActionTypes.success &&
    !action.payload.calendarQueryAlreadyUpdated
  ) {
    const { startDate, endDate } = action.payload.calendarQuery;
    return { ...state, startDate, endDate };
  }
  return state;
}
