// @flow

import reduceCalendarFilters from './calendar-filters-reducer.js';
import reduceConnectionInfo from './connection-reducer.js';
import reduceDataLoaded from './data-loaded-reducer.js';
import { reduceDeviceToken } from './device-token-reducer.js';
import { reduceDraftStore } from './draft-reducer.js';
import reduceEnabledApps from './enabled-apps-reducer.js';
import { reduceEntryInfos } from './entry-reducer.js';
import reduceLifecycleState from './lifecycle-state-reducer.js';
import { reduceLoadingStatuses } from './loading-reducer.js';
import reduceNextLocalID from './local-id-reducer.js';
import { reduceMessageStore } from './message-reducer.js';
import reduceBaseNavInfo from './nav-reducer.js';
import { reduceNotifPermissionAlertInfo } from './notif-permission-alert-info-reducer.js';
import policiesReducer from './policies-reducer.js';
import reduceReportStore from './report-store-reducer.js';
import reduceServicesAccessToken from './services-access-token-reducer.js';
import { reduceThreadInfos } from './thread-reducer.js';
import reduceUpdatesCurrentAsOf from './updates-reducer.js';
import reduceURLPrefix from './url-prefix-reducer.js';
import { reduceCurrentUserInfo, reduceUserInfos } from './user-reducer.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  registerActionTypes,
  logInActionTypes,
} from '../actions/user-actions.js';
import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState, BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';

export default function baseReducer<N: BaseNavInfo, T: BaseAppState<N>>(
  state: T,
  action: BaseAction,
): { state: T, storeOperations: StoreOperations } {
  const { threadStore, newThreadInconsistencies, threadStoreOperations } =
    reduceThreadInfos(state.threadStore, action);
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
  const { messageStoreOperations, messageStore: reducedMessageStore } =
    reduceMessageStore(state.messageStore, action, threadInfos);
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
    action.type !== logInActionTypes.success &&
    action.type !== siweAuthActionTypes.success
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
      notifPermissionAlertInfo: reduceNotifPermissionAlertInfo(
        state.notifPermissionAlertInfo,
        action,
      ),
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
      userPolicies: policiesReducer(state.userPolicies, action),
      deviceToken: reduceDeviceToken(state.deviceToken, action),
      commServicesAccessToken: reduceServicesAccessToken(
        state.commServicesAccessToken,
        action,
      ),
    },
    storeOperations: {
      draftStoreOperations,
      threadStoreOperations,
      messageStoreOperations,
    },
  };
}
