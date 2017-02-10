// @flow

import type { BaseAppState, BaseAction } from '../types/redux-types';

import { reduceLoadingStatuses } from './loading-reducer';
import reduceEntryInfos from './entry-reducer';
import reduceUserInfo from './user-reducer';
import reduceCalendarInfos from './calendar-reducer';

export default function baseReducer<T: BaseAppState>(
  state: T,
  action: BaseAction<T>,
): T {
  if (action.type === "GENERIC") {
    return action.callback(state);
  }
  const test = {
    ...state,
    loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    entryInfos: reduceEntryInfos(state.entryInfos, action),
    userInfo: reduceUserInfo(state.userInfo, action),
    calendarInfos: reduceCalendarInfos(state.calendarInfos, action),
  };
  return test;
}
