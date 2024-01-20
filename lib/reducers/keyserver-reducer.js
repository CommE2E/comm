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
  keyserverRegisterActionTypes,
  logInActionTypes,
  resetUserStateActionType,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import {
  keyserverStoreOpsHandlers,
  type ReplaceKeyserverOperation,
  type RemoveKeyserversOperation,
} from '../ops/keyserver-store-ops.js';
import { queueActivityUpdatesActionType } from '../types/activity-types.js';
import type { KeyserverInfos, KeyserverStore } from '../types/keyserver-types';
import type { BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
  updateConnectionStatusActionType,
  setLateResponseActionType,
  updateDisconnectedBarActionType,
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
): KeyserverStore {
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
      ...state,
      keyserverInfos: processStoreOps(state.keyserverInfos, [replaceOperation]),
    };
  } else if (action.type === removeKeyserverActionType) {
    const removeOperation: RemoveKeyserversOperation = {
      type: 'remove_keyservers',
      payload: {
        ids: [action.payload.keyserverAdminUserID],
      },
    };

    return {
      ...state,
      keyserverInfos: processStoreOps(state.keyserverInfos, [removeOperation]),
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
      ...state,
      keyserverInfos: processStoreOps(state.keyserverInfos, replaceOperations),
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
      return state;
    }

    let newKeyserverInfo = {
      ...state.keyserverInfos[keyserverID],
    };

    if (sessionChange.cookie !== undefined) {
      newKeyserverInfo = {
        ...newKeyserverInfo,
        cookie: sessionChange.cookie,
      };
    }
    if (sessionChange.cookieInvalidated) {
      newKeyserverInfo = {
        ...newKeyserverInfo,
        connection: {
          ...newKeyserverInfo.connection,
          queuedActivityUpdates: [],
        },
      };
    }

    const operations: ReplaceKeyserverOperation[] = [
      {
        type: 'replace_keyserver',
        payload: {
          id: keyserverID,
          keyserverInfo: newKeyserverInfo,
        },
      },
    ];

    return {
      ...state,
      keyserverInfos: processStoreOps(state.keyserverInfos, operations),
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
          },
        },
      });
    }
    return {
      ...state,
      keyserverInfos: processStoreOps(state.keyserverInfos, operations),
    };
  } else if (action.type === fullStateSyncActionType) {
    const { keyserverID } = action.payload;
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          updatesCurrentAsOf: action.payload.updatesCurrentAsOf,
        },
      },
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
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          updatesCurrentAsOf: action.payload.updatesResult.currentAsOf,
          deviceToken,
        },
      },
    };
  } else if (action.type === processUpdatesActionType) {
    const { keyserverID } = action.payload;
    const updatesCurrentAsOf = Math.max(
      action.payload.updatesResult.currentAsOf,
      state.keyserverInfos[keyserverID].updatesCurrentAsOf,
    );
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          updatesCurrentAsOf,
        },
      },
    };
  } else if (action.type === setURLPrefix) {
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [ashoatKeyserverID]: {
          ...state.keyserverInfos[ashoatKeyserverID],
          urlPrefix: action.payload,
        },
      },
    };
  } else if (action.type === updateLastCommunicatedPlatformDetailsActionType) {
    const { keyserverID, platformDetails } = action.payload;
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          lastCommunicatedPlatformDetails: platformDetails,
        },
      },
    };
  } else if (action.type === keyserverRegisterActionTypes.success) {
    state = {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [ashoatKeyserverID]: {
          ...state.keyserverInfos[ashoatKeyserverID],
          lastCommunicatedPlatformDetails: getConfig().platformDetails,
        },
      },
    };
  } else if (action.type === updateConnectionStatusActionType) {
    const { keyserverID, status } = action.payload;
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            status,
            lateResponses: [],
          },
        },
      },
    };
  } else if (action.type === unsupervisedBackgroundActionType) {
    const { keyserverID } = action.payload;
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            status: 'disconnected',
            lateResponses: [],
          },
        },
      },
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

    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          connection,
        },
      },
    };
  } else if (action.type === updateActivityActionTypes.success) {
    const { activityUpdates } = action.payload;
    let keyserverInfos = { ...state.keyserverInfos };
    for (const keyserverID in activityUpdates) {
      const oldConnection = keyserverInfos[keyserverID].connection;
      const queuedActivityUpdates = oldConnection.queuedActivityUpdates.filter(
        activityUpdate =>
          !activityUpdates[keyserverID].includes(activityUpdate),
      );

      keyserverInfos = {
        ...keyserverInfos,
        [keyserverID]: {
          ...keyserverInfos[keyserverID],
          connection: { ...oldConnection, queuedActivityUpdates },
        },
      };
    }
    return {
      ...state,
      keyserverInfos,
    };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteKeyserverAccountActionTypes.success
  ) {
    // We want to remove all keyservers but Ashoat's keyserver
    const oldConnection = state.keyserverInfos[ashoatKeyserverID].connection;

    const keyserverInfos = {
      [ashoatKeyserverID]: {
        ...state.keyserverInfos[ashoatKeyserverID],
        connection: {
          ...oldConnection,
          connectionIssue: null,
          queuedActivityUpdates: [],
        },
        cookie: null,
      },
    };

    return {
      ...state,
      keyserverInfos,
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
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            lateResponses: [...lateResponsesSet],
          },
        },
      },
    };
  } else if (action.type === updateDisconnectedBarActionType) {
    const { keyserverID } = action.payload;
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            showDisconnectedBar: action.payload.visible,
          },
        },
      },
    };
  } else if (action.type === setDeviceTokenActionTypes.success) {
    const { deviceTokens } = action.payload;
    const keyserverInfos: { ...KeyserverInfos } = { ...state.keyserverInfos };
    for (const keyserverID in deviceTokens) {
      keyserverInfos[keyserverID] = {
        ...keyserverInfos[keyserverID],
        deviceToken: deviceTokens[keyserverID],
      };
    }
    return {
      ...state,
      keyserverInfos,
    };
  } else if (action.type === setConnectionIssueActionType) {
    const { connectionIssue, keyserverID } = action.payload;
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          connection: {
            ...state.keyserverInfos[keyserverID].connection,
            connectionIssue,
          },
        },
      },
    };
  }

  return state;
}
