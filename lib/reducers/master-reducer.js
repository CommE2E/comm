// @flow

import type { BaseAppState, BaseAction } from '../types/redux-types';

import { reduceLoadingStatuses } from './loading-reducer';
import reduceEntryInfos from './entry-reducer';
import reduceUserInfo from './user-reducer';
import reduceCalendarInfos from './calendar-reducer';
import reduceNavInfo from './nav-reducer';

export default function baseReducer<T: BaseAppState>(
  state: T,
  action: BaseAction<T>,
): T {
  // NavInfo has to be handled differently because of the covariance
  // (see comment about "+" in redux-types.js)
  const baseNavInfo = reduceNavInfo(state.navInfo, action);
  const test = {
    ...state,
    loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    entryInfos: reduceEntryInfos(state.entryInfos, action),
    userInfo: reduceUserInfo(state.userInfo, action),
    calendarInfos: reduceCalendarInfos(state.calendarInfos, action),
    navInfo: {
      ...state.navInfo,
      ...baseNavInfo,
    },
  };
  return test;
}
