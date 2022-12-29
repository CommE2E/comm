// @flow

import { updateCalendarQueryActionTypes } from '../actions/entry-actions';
import { siweAuthActionTypes } from '../actions/siwe-actions';
import { logInActionTypes, registerActionTypes } from '../actions/user-actions';
import type { BaseNavInfo } from '../types/nav-types';
import type { BaseAction } from '../types/redux-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';

export default function reduceBaseNavInfo<T: BaseNavInfo>(
  state: T,
  action: BaseAction,
): T {
  if (
    action.type === logInActionTypes.started ||
    action.type === siweAuthActionTypes.started ||
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
