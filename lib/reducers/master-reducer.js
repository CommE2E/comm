// @flow

import { registerActionTypes, logInActionTypes } from '../actions/user-actions';
import type { BaseNavInfo } from '../types/nav-types';
import type { BaseAppState, BaseAction } from '../types/redux-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';
import reduceCalendarFilters from './calendar-filters-reducer';
import reduceConnectionInfo from './connection-reducer';
import reduceCrashReportsEnabled from './crash-reports-enabled-reducer';
import reduceDataLoaded from './data-loaded-reducer';
import reduceEnabledApps from './enabled-apps-reducer';
import reduceEnabledReports from './enabled-reports-reducer';
import { reduceEntryInfos } from './entry-reducer';
import reduceLifecycleState from './lifecycle-state-reducer';
import { reduceLoadingStatuses } from './loading-reducer';
import reduceNextLocalID from './local-id-reducer';
import { reduceMessageStore } from './message-reducer';
import reduceBaseNavInfo from './nav-reducer';
import reduceQueuedReports from './report-reducer';
import reduceThreadInfos from './thread-reducer';
import reduceUpdatesCurrentAsOf from './updates-reducer';
import reduceURLPrefix from './url-prefix-reducer';
import { reduceCurrentUserInfo, reduceUserInfos } from './user-reducer';

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
    action.type !== fullStateSyncActionType &&
    action.type !== registerActionTypes.success &&
    action.type !== logInActionTypes.success
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
    messageStore,
    updatesCurrentAsOf,
    urlPrefix: reduceURLPrefix(state.urlPrefix, action),
    calendarFilters: reduceCalendarFilters(state.calendarFilters, action),
    connection,
    lifecycleState: reduceLifecycleState(state.lifecycleState, action),
    enabledApps: reduceEnabledApps(state.enabledApps, action),
    enabledReports: reduceEnabledReports(state.enabledReports, action),
    crashReportsEnabled: reduceCrashReportsEnabled(
      state.crashReportsEnabled,
      action,
    ),
    nextLocalID: reduceNextLocalID(state.nextLocalID, action),
    queuedReports: reduceQueuedReports(state.queuedReports, action),
    dataLoaded: reduceDataLoaded(state.dataLoaded, action),
  };
}
