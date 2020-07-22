// @flow

import type { BaseAppState, BaseAction } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';

import { reduceLoadingStatuses } from './loading-reducer';
import { reduceEntryInfos } from './entry-reducer';
import { reduceCurrentUserInfo, reduceUserInfos } from './user-reducer';
import reduceThreadInfos from './thread-reducer';
import reduceBaseNavInfo from './nav-reducer';
import { reduceMessageStore } from './message-reducer';
import reduceUpdatesCurrentAsOf from './updates-reducer';
import reduceURLPrefix from './url-prefix-reducer';
import reduceCalendarFilters from './calendar-filters-reducer';
import reduceConnectionInfo from './connection-reducer';
import reduceForeground from './foreground-reducer';
import reduceNextLocalID from './local-id-reducer';
import reduceQueuedReports from './report-reducer';
import reduceDataLoaded from './data-loaded-reducer';

export default function baseReducer<N: BaseNavInfo, T: BaseAppState<N>>(
  state: T,
  action: BaseAction,
): T {
  const threadStore = reduceThreadInfos(state.threadStore, action);
  const { threadInfos } = threadStore;

  // Only allow checkpoints to increase if we are connected
  // or if the action is a STATE_SYNC
  let messageStore = reduceMessageStore(
    state.messageStore,
    action,
    threadInfos,
  );
  let updatesCurrentAsOf = reduceUpdatesCurrentAsOf(
    state.updatesCurrentAsOf,
    action,
  );
  const connection = reduceConnectionInfo(state.connection, action);
  if (
    connection.status !== 'connected' &&
    action.type !== incrementalStateSyncActionType &&
    action.type !== fullStateSyncActionType
  ) {
    if (messageStore.currentAsOf !== state.messageStore.currentAsOf) {
      messageStore = {
        ...messageStore,
        currentAsOf: state.messageStore.currentAsOf,
      };
    }
    if (updatesCurrentAsOf !== state.updatesCurrentAsOf) {
      updatesCurrentAsOf = state.updatesCurrentAsOf;
    }
  }

  return {
    ...state,
    navInfo: reduceBaseNavInfo(state.navInfo, action),
    entryStore: reduceEntryInfos(state.entryStore, action, threadInfos),
    loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
    currentUserInfo: reduceCurrentUserInfo(state.currentUserInfo, action),
    threadStore,
    userStore: reduceUserInfos(state.userStore, action),
    messageStore: reduceMessageStore(state.messageStore, action, threadInfos),
    updatesCurrentAsOf,
    urlPrefix: reduceURLPrefix(state.urlPrefix, action),
    calendarFilters: reduceCalendarFilters(state.calendarFilters, action),
    connection,
    foreground: reduceForeground(state.foreground, action),
    nextLocalID: reduceNextLocalID(state.nextLocalID, action),
    queuedReports: reduceQueuedReports(state.queuedReports, action),
    dataLoaded: reduceDataLoaded(state.dataLoaded, action),
  };
}
