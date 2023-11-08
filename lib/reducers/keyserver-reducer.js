// @flow

import reduceConnectionInfo from './connection-reducer.js';
import { reduceDeviceToken } from './device-token-reducer.js';
import { updateLastCommunicatedPlatformDetailsActionType } from '../actions/device-actions.js';
import { addKeyserverActionType } from '../actions/keyserver-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logInActionTypes,
  resetUserStateActionType,
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions.js';
import type { KeyserverStore } from '../types/keyserver-types';
import type { BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import { processUpdatesActionType } from '../types/update-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { getConfig } from '../utils/config.js';
import { setURLPrefix } from '../utils/url-utils.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

export default function reduceKeyserverStore(
  state: KeyserverStore,
  action: BaseAction,
): KeyserverStore {
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success
  ) {
    state = {
      keyserverInfos: {
        [ashoatKeyserverID]: {
          ...state.keyserverInfos[ashoatKeyserverID],
        },
      },
    };
  } else if (action.type === addKeyserverActionType) {
    return {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [action.payload.keyserverAdminUserID]: {
          ...action.payload.newKeyserverInfo,
        },
      },
    };
  } else if (action.type === resetUserStateActionType) {
    // this action is only dispatched on native
    const keyserverInfos = { ...state.keyserverInfos };
    for (const keyserverID in keyserverInfos) {
      const stateCookie = state.keyserverInfos[keyserverID]?.cookie;
      const cookie =
        stateCookie && stateCookie.startsWith('anonymous=')
          ? stateCookie
          : null;
      keyserverInfos[keyserverID] = { ...keyserverInfos[keyserverID], cookie };
    }

    state = {
      ...state,
      keyserverInfos,
    };
  } else if (action.type === setNewSessionActionType) {
    const { keyserverID } = action.payload;
    if (action.payload.sessionChange.cookie !== undefined) {
      state = {
        ...state,
        keyserverInfos: {
          ...state.keyserverInfos,
          [keyserverID]: {
            ...state.keyserverInfos[keyserverID],
            cookie: action.payload.sessionChange.cookie,
          },
        },
      };
    }
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success
  ) {
    const { updatesCurrentAsOf } = action.payload;
    for (const keyserverID in updatesCurrentAsOf) {
      state = {
        ...state,
        keyserverInfos: {
          ...state.keyserverInfos,
          [keyserverID]: {
            ...state.keyserverInfos[keyserverID],
            updatesCurrentAsOf: updatesCurrentAsOf[keyserverID],
            lastCommunicatedPlatformDetails: getConfig().platformDetails,
          },
        },
      };
    }
  } else if (action.type === fullStateSyncActionType) {
    const { keyserverID } = action.payload;
    state = {
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
    state = {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          updatesCurrentAsOf: action.payload.updatesResult.currentAsOf,
        },
      },
    };
  } else if (action.type === processUpdatesActionType) {
    const { keyserverID } = action.payload;
    const updatesCurrentAsOf = Math.max(
      action.payload.updatesResult.currentAsOf,
      state.keyserverInfos[ashoatKeyserverID].updatesCurrentAsOf,
    );
    state = {
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
    state = {
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
    const { keyserverID } = action.payload;
    state = {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverID]: {
          ...state.keyserverInfos[keyserverID],
          lastCommunicatedPlatformDetails: action.payload,
        },
      },
    };
  }

  const connection = reduceConnectionInfo(
    state.keyserverInfos[ashoatKeyserverID].connection,
    action,
  );
  const deviceToken = reduceDeviceToken(
    state.keyserverInfos[ashoatKeyserverID].deviceToken,
    action,
  );
  if (
    connection !== state.keyserverInfos[ashoatKeyserverID].connection ||
    deviceToken !== state.keyserverInfos[ashoatKeyserverID].deviceToken
  ) {
    state = {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [ashoatKeyserverID]: {
          ...state.keyserverInfos[ashoatKeyserverID],
          connection,
          deviceToken,
        },
      },
    };
  }

  return state;
}
