// @flow

import { unsupervisedBackgroundActionType } from './lifecycle-state-reducer.js';
import { updateActivityActionTypes } from '../actions/activity-actions.js';
import {
  updateLastCommunicatedPlatformDetailsActionType,
  setDeviceTokenActionTypes,
} from '../actions/device-actions.js';
import {
  addKeyserverActionType,
  removeKeyserverActionType,
} from '../actions/keyserver-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  keyserverAuthActionTypes,
  logOutActionTypes,
  deleteKeyserverAccountActionTypes,
  deleteAccountActionTypes,
  keyserverRegisterActionTypes,
  logInActionTypes,
  resetUserStateActionType,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import {
  keyserverStoreOpsHandlers,
  type ReplaceKeyserverOperation,
  type RemoveKeyserversOperation,
  type KeyserverStoreOperation,
} from '../ops/keyserver-store-ops.js';
import { queueActivityUpdatesActionType } from '../types/activity-types.js';
import type { KeyserverStore } from '../types/keyserver-types.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
  updateConnectionStatusActionType,
  setLateResponseActionType,
  updateKeyserverReachabilityActionType,
  setConnectionIssueActionType,
} from '../types/socket-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import { processUpdatesActionType } from '../types/update-types.js';
import { getConfig } from '../utils/config.js';
import { setURLPrefix } from '../utils/url-utils.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

const { processStoreOperations: processStoreOps } = keyserverStoreOpsHandlers;

export default function reduceKeyserverStore(
  state: KeyserverStore,
  action: BaseAction,
): {
  keyserverStore: KeyserverStore,
  keyserverStoreOperations: $ReadOnlyArray<KeyserverStoreOperation>,
} {
  if (action.type === addKeyserverActionType) {
    const replaceOperation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: action.payload.keyserverAdminUserID,
        keyserverInfo: {
          ...action.payload.newKeyserverInfo,
        },
      },
    };

    return {
      keyserverStore: processStoreOps(state, [replaceOperation]),
      keyserverStoreOperations: [replaceOperation],
    };
  } else if (action.type === removeKeyserverActionType) {
    const removeOperation: RemoveKeyserversOperation = {
      type: 'remove_keyservers',
      payload: {
        ids: [action.payload.keyserverAdminUserID],
      },
    };

    return {
      keyserverStore: processStoreOps(state, [removeOperation]),
      keyserverStoreOperations: [removeOperation],
    };
  } else if (action.type === resetUserStateActionType) {
    // this action is only dispatched on native
    const replaceOperations: ReplaceKeyserverOperation[] = [];
    for (const keyserverID in state.keyserverInfos) {
      const stateCookie = state.keyserverInfos[keyserverID]?.cookie;
      if (stateCookie && stateCookie.startsWith('anonymous=')) {
        continue;
      }
      replaceOperations.push({
        type: 'replace_keyserver',
        payload: {
          id: keyserverID,
          keyserverInfo: {
            ...state.keyserverInfos[keyserverID],
            cookie: null,
          },
        },
      });
    }

    return {
      keyserverStore: processStoreOps(state, replaceOperations),
      keyserverStoreOperations: replaceOperations,
    };
  } else if (action.type === setNewSessionActionType) {
    const { keyserverID, sessionChange } = action.payload;
    if (!state.keyserverInfos[keyserverID]) {
      if (sessionChange.cookie?.startsWith('user=')) {
        console.log(
          'received sessionChange with user cookie, ' +
            `but keyserver ${keyserverID} is not in KeyserverStore!`,
        );
      }
      return {
        keyserverStore: state,
        keyserverStoreOperations: [],
      };
    }

    let newKeyserverInfo = {
      ...state.keyserverInfos[keyserverID],
    };
    let keyserverUpdated = false;

    if (sessionChange.cookie !== undefined) {
      newKeyserverInfo = {
        ...newKeyserverInfo,
        cookie: sessionChange.cookie,
      };
      keyserverUpdated = true;
    }
    if (sessionChange.cookieInvalidated) {
      newKeyserverInfo = {
        ...newKeyserverInfo,
        connection: {
          ...newKeyserverInfo.connection,
          queuedActivityUpdates: [],
        },
      };
      keyserverUpdated = true;
    }

    const operations: ReplaceKeyserverOperation[] = [];
    if (keyserverUpdated) {
      operations.push({
        type: 'replace_keyserver',
        payload: {
          id: keyserverID,
          keyserverInfo: newKeyserverInfo,
        },
      });
    }

    return {
      keyserverStore: processStoreOps(state, operations),
      keyserverStoreOperations: operations,
    };
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === keyserverAuthActionTypes.success
  ) {
    const { updatesCurrentAsOf } = action.payload;

    const operations: ReplaceKeyserverOperation[] = [];
    for (const keyserverID in updatesCurrentAsOf) {
      operations.push({
        type: 'replace_keyserver',
        payload: {
          id: keyserverID,
          keyserverInfo: {
            ...state.keyserverInfos[keyserverID],
            updatesCurrentAsOf: updatesCurrentAsOf[keyserverID],
            lastCommunicatedPlatformDetails: getConfig().platformDetails,
            connection: {
              ...state.keyserverInfos[keyserverID].connection,
              connectionIssue: null,
            },
          },
        },
      });
    }
    return {
      keyserverStore: processStoreOps(state, operations),
      keyserverStoreOperations: operations,
    };
  } else if (action.type === fullStateSyncActionType) {
    const { keyserverID } = action.payload;
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          updatesCurrentAsOf: action.payload.updatesCurrentAsOf,
        },
      },
    };

    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === incrementalStateSyncActionType) {
    const { keyserverID } = action.payload;
    let { deviceToken } = state.keyserverInfos[keyserverID];
    for (const update of action.payload.updatesResult.newUpdates) {
      if (
        update.type === updateTypes.BAD_DEVICE_TOKEN &&
        update.deviceToken === state.keyserverInfos[keyserverID].deviceToken
      ) {
        deviceToken = null;
        break;
      }
    }
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          updatesCurrentAsOf: action.payload.updatesResult.currentAsOf,
          deviceToken,
        },
      },
    };

    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === processUpdatesActionType) {
    const { keyserverID } = action.payload;
    const updatesCurrentAsOf = Math.max(
      action.payload.updatesResult.currentAsOf,
      state.keyserverInfos[keyserverID].updatesCurrentAsOf,
    );
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          updatesCurrentAsOf,
        },
      },
    };
    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === setURLPrefix) {
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: ashoatKeyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[ashoatKeyserverID],
          urlPrefix: action.payload,
        },
      },
    };
    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === updateLastCommunicatedPlatformDetailsActionType) {
    const { keyserverID, platformDetails } = action.payload;
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          lastCommunicatedPlatformDetails: platformDetails,
        },
      },
    };
    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === keyserverRegisterActionTypes.success) {
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: ashoatKeyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[ashoatKeyserverID],
          lastCommunicatedPlatformDetails: getConfig().platformDetails,
        },
      },
    };
    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === updateConnectionStatusActionType) {
    const { keyserverID, status } = action.payload;
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            status,
            lateResponses: [],
          },
        },
      },
    };
    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === unsupervisedBackgroundActionType) {
    const { keyserverID } = action.payload;
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            status: 'disconnected',
            lateResponses: [],
          },
        },
      },
    };
    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === queueActivityUpdatesActionType) {
    const { activityUpdates, keyserverID } = action.payload;
    const oldConnection = state.keyserverInfos[keyserverID].connection;
    const connection = {
      ...oldConnection,
      queuedActivityUpdates: [
        ...oldConnection.queuedActivityUpdates.filter(existingUpdate => {
          for (const activityUpdate of activityUpdates) {
            if (
              ((existingUpdate.focus && activityUpdate.focus) ||
                (existingUpdate.focus === false &&
                  activityUpdate.focus !== undefined)) &&
              existingUpdate.threadID === activityUpdate.threadID
            ) {
              return false;
            }
          }
          return true;
        }),
        ...activityUpdates,
      ],
    };

    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          connection,
        },
      },
    };

    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === updateActivityActionTypes.success) {
    const { activityUpdates } = action.payload;

    const operations: ReplaceKeyserverOperation[] = [];
    for (const keyserverID in activityUpdates) {
      const oldConnection = state.keyserverInfos[keyserverID].connection;
      const queuedActivityUpdates = oldConnection.queuedActivityUpdates.filter(
        activityUpdate =>
          !activityUpdates[keyserverID].includes(activityUpdate),
      );

      operations.push({
        type: 'replace_keyserver',
        payload: {
          id: keyserverID,
          keyserverInfo: {
            ...state.keyserverInfos[keyserverID],
            connection: { ...oldConnection, queuedActivityUpdates },
          },
        },
      });
    }
    return {
      keyserverStore: processStoreOps(state, operations),
      keyserverStoreOperations: operations,
    };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    // We want to remove all keyservers but Ashoat's keyserver
    const oldConnection = state.keyserverInfos[ashoatKeyserverID].connection;
    const operations: KeyserverStoreOperation[] = [
      { type: 'remove_all_keyservers' },
    ];
    operations.push({
      type: 'replace_keyserver',
      payload: {
        id: ashoatKeyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[ashoatKeyserverID],
          connection: {
            ...oldConnection,
            connectionIssue: null,
            queuedActivityUpdates: [],
            lateResponses: [],
          },
          cookie: null,
        },
      },
    });

    return {
      keyserverStore: processStoreOps(state, operations),
      keyserverStoreOperations: operations,
    };
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    const operations: KeyserverStoreOperation[] = [
      {
        type: 'remove_keyservers',
        payload: { ids: action.payload.keyserverIDs },
      },
    ];
    if (action.payload.keyserverIDs.includes(ashoatKeyserverID)) {
      const oldConnection = state.keyserverInfos[ashoatKeyserverID].connection;
      operations.push({
        type: 'replace_keyserver',
        payload: {
          id: ashoatKeyserverID,
          keyserverInfo: {
            ...state.keyserverInfos[ashoatKeyserverID],
            connection: {
              ...oldConnection,
              connectionIssue: null,
              queuedActivityUpdates: [],
              lateResponses: [],
            },
            cookie: null,
          },
        },
      });
    }

    return {
      keyserverStore: processStoreOps(state, operations),
      keyserverStoreOperations: operations,
    };
  } else if (action.type === setLateResponseActionType) {
    const { messageID, isLate, keyserverID } = action.payload;
    const lateResponsesSet = new Set<number>(
      state.keyserverInfos[keyserverID].connection.lateResponses,
    );
    if (isLate) {
      lateResponsesSet.add(messageID);
    } else {
      lateResponsesSet.delete(messageID);
    }
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            lateResponses: [...lateResponsesSet],
          },
        },
      },
    };

    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === updateKeyserverReachabilityActionType) {
    const { keyserverID } = action.payload;
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            unreachable: action.payload.visible,
          },
        },
      },
    };
    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  } else if (action.type === setDeviceTokenActionTypes.success) {
    const { deviceTokens } = action.payload;
    const operations: ReplaceKeyserverOperation[] = [];
    for (const keyserverID in deviceTokens) {
      operations.push({
        type: 'replace_keyserver',
        payload: {
          id: keyserverID,
          keyserverInfo: {
            ...state.keyserverInfos[keyserverID],
            deviceToken: deviceTokens[keyserverID],
          },
        },
      });
    }
    return {
      keyserverStore: processStoreOps(state, operations),
      keyserverStoreOperations: operations,
    };
  } else if (action.type === setConnectionIssueActionType) {
    const { connectionIssue, keyserverID } = action.payload;
    const operation: ReplaceKeyserverOperation = {
      type: 'replace_keyserver',
      payload: {
        id: keyserverID,
        keyserverInfo: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            connectionIssue,
          },
        },
      },
    };
    return {
      keyserverStore: processStoreOps(state, [operation]),
      keyserverStoreOperations: [operation],
    };
  }

  return {
    keyserverStore: state,
    keyserverStoreOperations: [],
  };
}
