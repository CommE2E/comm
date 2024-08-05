// @flow

import {
  setAuxUserFIDsActionType,
  addAuxUserFIDsActionType,
  clearAuxUserFIDsActionType,
  setPeerDeviceListsActionType,
} from '../actions/aux-user-actions.js';
import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import {
  auxUserStoreOpsHandlers,
  type AuxUserStoreOperation,
  type RemoveAuxUserInfosOperation,
  type ReplaceAuxUserInfoOperation,
} from '../ops/aux-user-store-ops.js';
import type { AuxUserStore } from '../types/aux-user-types.js';
import type { BaseAction } from '../types/redux-types';
import {
  serverRequestTypes,
  processServerRequestsActionType,
} from '../types/request-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

const { processStoreOperations: processStoreOps } = auxUserStoreOpsHandlers;

function reduceAuxUserStore(
  state: AuxUserStore,
  action: BaseAction,
): {
  +auxUserStore: AuxUserStore,
  +auxUserStoreOperations: $ReadOnlyArray<AuxUserStoreOperation>,
} {
  if (action.type === setAuxUserFIDsActionType) {
    const toUpdateUserIDs = new Set(
      action.payload.farcasterUsers.map(farcasterUser => farcasterUser.userID),
    );
    const replaceOperations: ReplaceAuxUserInfoOperation[] = [];
    for (const userID in state.auxUserInfos) {
      if (
        state.auxUserInfos[userID].fid !== null &&
        !toUpdateUserIDs.has(userID)
      ) {
        replaceOperations.push({
          type: 'replace_aux_user_info',
          payload: {
            id: userID,
            auxUserInfo: {
              ...state.auxUserInfos[userID],
              fid: null,
            },
          },
        });
      }
    }
    for (const farcasterUser of action.payload.farcasterUsers) {
      replaceOperations.push({
        type: 'replace_aux_user_info',
        payload: {
          id: farcasterUser.userID,
          auxUserInfo: {
            ...state.auxUserInfos[farcasterUser.userID],
            fid: farcasterUser.farcasterID,
          },
        },
      });
    }
    return {
      auxUserStore: processStoreOps(state, replaceOperations),
      auxUserStoreOperations: replaceOperations,
    };
  } else if (action.type === addAuxUserFIDsActionType) {
    const replaceOperations: ReplaceAuxUserInfoOperation[] = [];
    for (const farcasterUser of action.payload.farcasterUsers) {
      replaceOperations.push({
        type: 'replace_aux_user_info',
        payload: {
          id: farcasterUser.userID,
          auxUserInfo: {
            ...state.auxUserInfos[farcasterUser.userID],
            fid: farcasterUser.farcasterID,
          },
        },
      });
    }
    return {
      auxUserStore: processStoreOps(state, replaceOperations),
      auxUserStoreOperations: replaceOperations,
    };
  } else if (action.type === clearAuxUserFIDsActionType) {
    const replaceOperations: ReplaceAuxUserInfoOperation[] = [];
    for (const userID in state.auxUserInfos) {
      if (state.auxUserInfos[userID].fid !== null) {
        replaceOperations.push({
          type: 'replace_aux_user_info',
          payload: {
            id: userID,
            auxUserInfo: {
              ...state.auxUserInfos[userID],
              fid: null,
            },
          },
        });
      }
    }

    return {
      auxUserStore: processStoreOps(state, replaceOperations),
      auxUserStoreOperations: replaceOperations,
    };
  } else if (action.type === setClientDBStoreActionType) {
    const newAuxUserInfos = action.payload.auxUserInfos;

    if (!newAuxUserInfos) {
      return {
        auxUserStore: state,
        auxUserStoreOperations: [],
      };
    }

    const newAuxUserStore: AuxUserStore = {
      ...state,
      auxUserInfos: newAuxUserInfos,
    };

    return {
      auxUserStore: newAuxUserStore,
      auxUserStoreOperations: [],
    };
  } else if (action.type === setPeerDeviceListsActionType) {
    const replaceOperations: ReplaceAuxUserInfoOperation[] = [];
    for (const userID in action.payload.deviceLists) {
      replaceOperations.push({
        type: 'replace_aux_user_info',
        payload: {
          id: userID,
          auxUserInfo: {
            ...state.auxUserInfos[userID],
            fid: state.auxUserInfos[userID]?.fid ?? null,
            deviceList: action.payload.deviceLists[userID],
            devicesPlatformDetails: action.payload.usersPlatformDetails[userID],
          },
        },
      });
    }
    return {
      auxUserStore: processStoreOps(state, replaceOperations),
      auxUserStoreOperations: replaceOperations,
    };
  } else if (
    action.type === processServerRequestsActionType &&
    relyingOnAuthoritativeKeyserver
  ) {
    if (action.payload.keyserverID !== authoritativeKeyserverID()) {
      return {
        auxUserStore: state,
        auxUserStoreOperations: [],
      };
    }
    const checkStateRequest = action.payload.serverRequests.find(
      candidate => candidate.type === serverRequestTypes.CHECK_STATE,
    );
    if (!checkStateRequest || !checkStateRequest.stateChanges) {
      return {
        auxUserStore: state,
        auxUserStoreOperations: [],
      };
    }
    const { deleteUserInfoIDs } = checkStateRequest.stateChanges;
    if (!deleteUserInfoIDs) {
      return {
        auxUserStore: state,
        auxUserStoreOperations: [],
      };
    }

    const removeUsersOps: RemoveAuxUserInfosOperation[] = [];
    if (deleteUserInfoIDs) {
      removeUsersOps.push({
        type: 'remove_aux_user_infos',
        payload: { ids: deleteUserInfoIDs },
      });
    }

    return {
      auxUserStore: processStoreOps(state, removeUsersOps),
      auxUserStoreOperations: [],
    };
  }

  return {
    auxUserStore: state,
    auxUserStoreOperations: [],
  };
}

export { reduceAuxUserStore };
