// @flow

import reduceCalendarFilters from './calendar-filters-reducer.js';
import { reduceCalendarQuery } from './calendar-query-reducer.js';
import reduceCustomerServer from './custom-server-reducer.js';
import reduceDataLoaded from './data-loaded-reducer.js';
import { reduceDraftStore } from './draft-reducer.js';
import reduceEnabledApps from './enabled-apps-reducer.js';
import { reduceEntryInfos } from './entry-reducer.js';
import { reduceIntegrityStore } from './integrity-reducer.js';
import reduceInviteLinks from './invite-links-reducer.js';
import reduceKeyserverStore from './keyserver-reducer.js';
import reduceLifecycleState from './lifecycle-state-reducer.js';
import { reduceLoadingStatuses } from './loading-reducer.js';
import reduceNextLocalID from './local-id-reducer.js';
import { reduceMessageStore } from './message-reducer.js';
import reduceBaseNavInfo from './nav-reducer.js';
import { reduceNotifPermissionAlertInfo } from './notif-permission-alert-info-reducer.js';
import policiesReducer from './policies-reducer.js';
import reduceReportStore from './report-store-reducer.js';
import reduceServicesAccessToken from './services-access-token-reducer.js';
import reduceGlobalThemeInfo from './theme-reducer.js';
import { reduceThreadActivity } from './thread-activity-reducer.js';
import { reduceThreadInfos } from './thread-reducer.js';
import { reduceCurrentUserInfo, reduceUserInfos } from './user-reducer.js';
import { addKeyserverActionType } from '../actions/keyserver-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  registerActionTypes,
  logInActionTypes,
} from '../actions/user-actions.js';
import { isStaff } from '../shared/staff-utils.js';
import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState, BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { isDev } from '../utils/dev-utils.js';

export default function baseReducer<N: BaseNavInfo, T: BaseAppState<N>>(
  state: T,
  action: BaseAction,
  onStateDifference: (message: string) => mixed,
): { state: T, storeOperations: StoreOperations } {
  const { threadStore, newThreadInconsistencies, threadStoreOperations } =
    reduceThreadInfos(state.threadStore, action);
  const { threadInfos } = threadStore;

  const [entryStore, newEntryInconsistencies] = reduceEntryInfos(
    state.entryStore,
    action,
    threadInfos,
  );

  const onStateDifferenceForStaff = (message: string) => {
    const isCurrentUserStaff = state.currentUserInfo?.id
      ? isStaff(state.currentUserInfo.id)
      : false;
    if (isCurrentUserStaff || isDev) {
      onStateDifference(message);
    }
  };

  const [userStore, newUserInconsistencies, userStoreOperations] =
    reduceUserInfos(state.userStore, action, onStateDifferenceForStaff);

  const newInconsistencies = [
    ...newEntryInconsistencies,
    ...newThreadInconsistencies,
    ...newUserInconsistencies,
  ];
  // Only allow checkpoints to increase if we are connected
  // or if the action is a STATE_SYNC
  const { messageStoreOperations, messageStore: reducedMessageStore } =
    reduceMessageStore(state.messageStore, action, threadInfos);
  let messageStore = reducedMessageStore;

  let keyserverStore = reduceKeyserverStore(state.keyserverStore, action);

  if (
    action.type !== incrementalStateSyncActionType &&
    action.type !== fullStateSyncActionType &&
    action.type !== registerActionTypes.success &&
    action.type !== logInActionTypes.success &&
    action.type !== siweAuthActionTypes.success &&
    action.type !== addKeyserverActionType
  ) {
    for (const keyserverID in keyserverStore.keyserverInfos) {
      if (
        keyserverStore.keyserverInfos[keyserverID].connection.status ===
        'connected'
      ) {
        continue;
      }
      if (
        messageStore.currentAsOf[keyserverID] !==
        state.messageStore.currentAsOf[keyserverID]
      ) {
        messageStore = {
          ...messageStore,
          currentAsOf: {
            ...messageStore.currentAsOf,
            [keyserverID]: state.messageStore.currentAsOf[keyserverID],
          },
        };
      }
      if (
        state.keyserverStore.keyserverInfos[keyserverID] &&
        keyserverStore.keyserverInfos[keyserverID].updatesCurrentAsOf !==
          state.keyserverStore.keyserverInfos[keyserverID].updatesCurrentAsOf
      ) {
        const keyserverInfos = { ...keyserverStore.keyserverInfos };
        keyserverInfos[keyserverID] = {
          ...keyserverInfos[keyserverID],
          updatesCurrentAsOf:
            state.keyserverStore.keyserverInfos[keyserverID].updatesCurrentAsOf,
        };
        keyserverStore = { ...keyserverStore, keyserverInfos };
      }
    }
  }

  const { draftStore, draftStoreOperations } = reduceDraftStore(
    state.draftStore,
    action,
  );

  const { reportStore, reportStoreOperations } = reduceReportStore(
    state.reportStore,
    action,
    newInconsistencies,
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
      userStore,
      messageStore,
      calendarFilters: reduceCalendarFilters(
        state.calendarFilters,
        action,
        threadStore,
      ),
      notifPermissionAlertInfo: reduceNotifPermissionAlertInfo(
        state.notifPermissionAlertInfo,
        action,
      ),
      actualizedCalendarQuery: reduceCalendarQuery(
        state.actualizedCalendarQuery,
        action,
      ),
      lifecycleState: reduceLifecycleState(state.lifecycleState, action),
      enabledApps: reduceEnabledApps(state.enabledApps, action),
      reportStore,
      nextLocalID: reduceNextLocalID(state.nextLocalID, action),
      dataLoaded: reduceDataLoaded(state.dataLoaded, action),
      userPolicies: policiesReducer(state.userPolicies, action),
      commServicesAccessToken: reduceServicesAccessToken(
        state.commServicesAccessToken,
        action,
      ),
      inviteLinksStore: reduceInviteLinks(state.inviteLinksStore, action),
      keyserverStore,
      threadActivityStore: reduceThreadActivity(
        state.threadActivityStore,
        action,
      ),
      integrityStore: reduceIntegrityStore(
        state.integrityStore,
        action,
        threadStore.threadInfos,
        threadStoreOperations,
      ),
      globalThemeInfo: reduceGlobalThemeInfo(state.globalThemeInfo, action),
      customServer: reduceCustomerServer(state.customServer, action),
    },
    storeOperations: {
      draftStoreOperations,
      threadStoreOperations,
      messageStoreOperations,
      reportStoreOperations,
      userStoreOperations,
    },
  };
}
