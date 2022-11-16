// @flow

import { registerActionTypes, logInActionTypes } from '../actions/user-actions';
import type { BaseNavInfo } from '../types/nav-types';
import type { BaseAppState, BaseAction } from '../types/redux-types';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types';
import type { StoreOperations } from '../types/store-ops-types';
import reduceCalendarFilters from './calendar-filters-reducer';
import reduceConnectionInfo from './connection-reducer';
import reduceDataLoaded from './data-loaded-reducer';
import { reduceDraftStore } from './draft-reducer';
import reduceEnabledApps from './enabled-apps-reducer';
import { reduceEntryInfos } from './entry-reducer';
import reduceLifecycleState from './lifecycle-state-reducer';
import { reduceLoadingStatuses } from './loading-reducer';
import reduceNextLocalID from './local-id-reducer';
import { reduceMessageStore } from './message-reducer';
import reduceBaseNavInfo from './nav-reducer';
import reduceReportStore from './report-store-reducer';
import { reduceThreadInfos } from './thread-reducer';
import reduceUpdatesCurrentAsOf from './updates-reducer';
import reduceURLPrefix from './url-prefix-reducer';
import { reduceCurrentUserInfo, reduceUserInfos } from './user-reducer';

export default function baseReducer<N: BaseNavInfo, T: BaseAppState<N>>(
  state: T,
  action: BaseAction,
): { state: T, storeOperations: StoreOperations } {
  const {
    threadStore,
    newThreadInconsistencies,
    threadStoreOperations,
  } = reduceThreadInfos(state.threadStore, action);
  const { threadInfos } = threadStore;

  const [entryStore, newEntryInconsistencies] = reduceEntryInfos(
    state.entryStore,
    action,
    threadInfos,
  );

  const newInconsistencies = [
    ...newEntryInconsistencies,
    ...newThreadInconsistencies,
  ];
  // Only allow checkpoints to increase if we are connected
  // or if the action is a STATE_SYNC
  const {
    messageStoreOperations,
    messageStore: reducedMessageStore,
  } = reduceMessageStore(state.messageStore, action, threadInfos);
  let messageStore = reducedMessageStore;
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

  const { draftStore, draftStoreOperations } = reduceDraftStore(
    state.draftStore,
    action,
  );

  return {
    state: {
      ...state,
      navInfo: reduceBaseNavInfo(state.navInfo, action),
      draftStore,
      entryStore,
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
      reportStore: reduceReportStore(
        state.reportStore,
        action,
        newInconsistencies,
      ),
      nextLocalID: reduceNextLocalID(state.nextLocalID, action),
      dataLoaded: reduceDataLoaded(state.dataLoaded, action),
    },
    storeOperations: {
      draftStoreOperations,
      threadStoreOperations,
      messageStoreOperations,
    },
  };
}
