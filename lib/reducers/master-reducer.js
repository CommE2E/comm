// @flow

import type { BaseAppState, BaseAction } from '../types/redux-types';

import { reduceLoadingStatuses } from './loading-reducer';
import { reduceEntryInfos } from './entry-reducer';
import reduceUserInfo from './user-reducer';
import reduceCalendarInfos from './calendar-reducer';
import reduceBaseNavInfo from './nav-reducer';

export default function baseReducer<T: BaseAppState>(
  state: T,
  action: BaseAction<T>,
): T {
  // NavInfo has to be handled differently because of the covariance
  // (see comment about "+" in redux-types.js)
  const baseNavInfo = reduceBaseNavInfo(state.navInfo, action);
  const navInfo = baseNavInfo === state.navInfo
    ? state.navInfo
    : { ...state.navInfo, ...baseNavInfo };
  const [entryInfos, daysToEntries] = reduceEntryInfos(
    state.entryInfos,
    state.daysToEntries,
    action,
  );
  const test = {
    ...state,
    navInfo,
    entryInfos,
    daysToEntries,
    loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    userInfo: reduceUserInfo(state.userInfo, action),
    calendarInfos: reduceCalendarInfos(state.calendarInfos, action),
  };
  return test;
}
