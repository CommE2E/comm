// @flow

import type { BaseAppState, BaseAction } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';

import invariant from 'invariant';

import { reduceLoadingStatuses } from './loading-reducer';
import { reduceEntryInfos } from './entry-reducer';
import { reduceCurrentUserInfo, reduceUserInfos } from './user-reducer';
import reduceThreadInfos from './thread-reducer';
import reduceBaseNavInfo from './nav-reducer';
import { reduceMessageStore } from './message-reducer';
import reduceUpdatesCurrentAsOf from './updates-reducer';
import { reduceDrafts } from './draft-reducer';
import reduceURLPrefix from './url-prefix-reducer';
import reduceCalendarFilters from './calendar-filters-reducer';
import reduceConnectionInfo from './connection-reducer';
import reduceForeground from './foreground-reducer';

export default function baseReducer<N: BaseNavInfo, T: BaseAppState<N>>(
  state: T,
  action: BaseAction,
): T {
  const threadStore = reduceThreadInfos(state.threadStore, action);
  const { threadInfos } = threadStore;

  // NavInfo has to be handled differently because of the covariance
  // (see comment about "+" in redux-types.js)
  const baseNavInfo = reduceBaseNavInfo(state.navInfo, action);
  const navInfo = baseNavInfo === state.navInfo
    ? state.navInfo
    : { ...state.navInfo, ...baseNavInfo };

  return {
    ...state,
    navInfo,
    entryStore: reduceEntryInfos(
      state.entryStore,
      action,
      threadInfos,
    ),
    loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    currentUserInfo: reduceCurrentUserInfo(state.currentUserInfo, action),
    threadStore,
    userInfos: reduceUserInfos(state.userInfos, action),
    messageStore: reduceMessageStore(state.messageStore, action, threadInfos),
    drafts: reduceDrafts(state.drafts, action),
    updatesCurrentAsOf: reduceUpdatesCurrentAsOf(
      state.updatesCurrentAsOf,
      action,
    ),
    urlPrefix: reduceURLPrefix(state.urlPrefix, action),
    calendarFilters: reduceCalendarFilters(
      state.calendarFilters,
      action,
    ),
    connection: reduceConnectionInfo(state.connection, action),
    foreground: reduceForeground(state.foreground, action),
  };
}
