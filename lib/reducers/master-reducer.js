// @flow

import { reduceAlertStore } from './alert-reducer.js';
import { reduceAuxUserStore } from './aux-user-reducer.js';
import reduceCalendarFilters from './calendar-filters-reducer.js';
import { reduceCommunityStore } from './community-reducer.js';
import reduceCustomerServer from './custom-server-reducer.js';
import reduceDataLoaded from './data-loaded-reducer.js';
import { reduceDBOpsStore } from './db-ops-reducer.js';
import { reduceDMOperationsQueue } from './dm-operations-queue-reducer.js';
import { reduceDraftStore } from './draft-reducer.js';
import reduceEnabledApps from './enabled-apps-reducer.js';
import { reduceEntryInfos } from './entry-reducer.js';
import { reduceHolderStore } from './holder-reducer.js';
import { reduceIntegrityStore } from './integrity-reducer.js';
import reduceInviteLinks from './invite-links-reducer.js';
import reduceKeyserverStore from './keyserver-reducer.js';
import reduceLifecycleState from './lifecycle-state-reducer.js';
import { reduceLoadingStatuses } from './loading-reducer.js';
import { reduceMessageStore } from './message-reducer.js';
import reduceBaseNavInfo from './nav-reducer.js';
import policiesReducer from './policies-reducer.js';
import reduceReportStore from './report-store-reducer.js';
import { reduceSyncedMetadataStore } from './synced-metadata-reducer.js';
import reduceGlobalThemeInfo from './theme-reducer.js';
import { reduceThreadActivity } from './thread-activity-reducer.js';
import { reduceThreadInfos } from './thread-reducer.js';
import reduceTunnelbrokerDeviceToken from './tunnelbroker-device-token-reducer.js';
import { reduceCurrentUserInfo, reduceUserInfos } from './user-reducer.js';
import { addKeyserverActionType } from '../actions/keyserver-actions.js';
import { legacySiweAuthActionTypes } from '../actions/siwe-actions.js';
import { fetchPendingUpdatesActionTypes } from '../actions/update-actions.js';
import {
  legacyLogInActionTypes,
  keyserverAuthActionTypes,
} from '../actions/user-actions.js';
import {
  keyserverStoreOpsHandlers,
  type ReplaceKeyserverOperation,
} from '../ops/keyserver-store-ops.js';
import { isStaff } from '../shared/staff-utils.js';
import { processDMOpsActionType } from '../types/dm-ops.js';
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
  const currentUserInfo = reduceCurrentUserInfo(state.currentUserInfo, action);
  const viewerID =
    currentUserInfo && !currentUserInfo.anonymous
      ? state.currentUserInfo?.id
      : null;

  const { threadStore, newThreadInconsistencies, threadStoreOperations } =
    reduceThreadInfos(state.threadStore, action, viewerID);
  const { threadInfos } = threadStore;

  const {
    entryStore,
    reportCreationRequests: newEntryInconsistencies,
    entryStoreOperations,
  } = reduceEntryInfos(state.entryStore, action, threadInfos);

  const onStateDifferenceForStaff = (message: string) => {
    const isCurrentUserStaff = state.currentUserInfo?.id
      ? isStaff(state.currentUserInfo.id)
      : false;
    if (isCurrentUserStaff || isDev) {
      onStateDifference(message);
    }
  };

  const [userStore, newUserInconsistencies, userStoreOperations] =
    reduceUserInfos(state.userStore, action);

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

  let { keyserverStore, keyserverStoreOperations } = reduceKeyserverStore(
    state.keyserverStore,
    action,
    onStateDifferenceForStaff,
  );

  if (
    action.type !== incrementalStateSyncActionType &&
    action.type !== fullStateSyncActionType &&
    action.type !== fetchPendingUpdatesActionTypes.success &&
    action.type !== legacyLogInActionTypes.success &&
    action.type !== legacySiweAuthActionTypes.success &&
    action.type !== keyserverAuthActionTypes.success &&
    action.type !== addKeyserverActionType
  ) {
    const replaceOperations: ReplaceKeyserverOperation[] = [];
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
        replaceOperations.push({
          type: 'replace_keyserver',
          payload: {
            id: keyserverID,
            keyserverInfo: {
              ...keyserverStore.keyserverInfos[keyserverID],
              updatesCurrentAsOf:
                state.keyserverStore.keyserverInfos[keyserverID]
                  .updatesCurrentAsOf,
            },
          },
        });
      }
    }

    keyserverStore = keyserverStoreOpsHandlers.processStoreOperations(
      keyserverStore,
      replaceOperations,
    );
    keyserverStoreOperations = [
      ...keyserverStoreOperations,
      ...replaceOperations,
    ];
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

  const { communityStore, communityStoreOperations } = reduceCommunityStore(
    state.communityStore,
    action,
  );

  const { integrityStore, integrityStoreOperations } = reduceIntegrityStore(
    state.integrityStore,
    action,
    threadInfos,
    threadStoreOperations,
  );

  const { syncedMetadataStore, syncedMetadataStoreOperations } =
    reduceSyncedMetadataStore(state.syncedMetadataStore, action);

  const { auxUserStore, auxUserStoreOperations } = reduceAuxUserStore(
    state.auxUserStore,
    action,
  );

  const { threadActivityStore, threadActivityStoreOperations } =
    reduceThreadActivity(state.threadActivityStore, action);

  const { store: queuedDMOperations, operations: dmOperationStoreOperations } =
    reduceDMOperationsQueue(state.queuedDMOperations, action);

  let storeOperations = {
    draftStoreOperations,
    threadStoreOperations,
    messageStoreOperations,
    reportStoreOperations,
    userStoreOperations,
    keyserverStoreOperations,
    communityStoreOperations,
    integrityStoreOperations,
    syncedMetadataStoreOperations,
    auxUserStoreOperations,
    threadActivityStoreOperations,
    entryStoreOperations,
    dmOperationStoreOperations,
  };

  if (
    action.type === processDMOpsActionType &&
    action.payload.outboundP2PMessages
  ) {
    storeOperations = {
      ...storeOperations,
      outboundP2PMessages: action.payload.outboundP2PMessages,
    };
  }

  return {
    state: {
      ...state,
      navInfo: reduceBaseNavInfo(state.navInfo, action),
      draftStore,
      entryStore,
      loadingStatuses: reduceLoadingStatuses(state.loadingStatuses, action),
      currentUserInfo,
      threadStore,
      userStore,
      messageStore,
      calendarFilters: reduceCalendarFilters(
        state.calendarFilters,
        action,
        threadStore,
      ),
      alertStore: reduceAlertStore(state.alertStore, action),
      lifecycleState: reduceLifecycleState(state.lifecycleState, action),
      enabledApps: reduceEnabledApps(state.enabledApps, action),
      reportStore,
      dataLoaded: reduceDataLoaded(state.dataLoaded, action),
      userPolicies: policiesReducer(state.userPolicies, action),
      inviteLinksStore: reduceInviteLinks(state.inviteLinksStore, action),
      keyserverStore,
      integrityStore,
      globalThemeInfo: reduceGlobalThemeInfo(state.globalThemeInfo, action),
      customServer: reduceCustomerServer(state.customServer, action),
      communityStore,
      dbOpsStore: reduceDBOpsStore(state.dbOpsStore, action),
      syncedMetadataStore,
      auxUserStore,
      threadActivityStore,
      tunnelbrokerDeviceToken: reduceTunnelbrokerDeviceToken(
        state.tunnelbrokerDeviceToken,
        action,
      ),
      queuedDMOperations,
      holderStore: reduceHolderStore(state.holderStore, action),
    },
    storeOperations,
  };
}
