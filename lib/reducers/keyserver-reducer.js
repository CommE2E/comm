// @flow

import reduceConnectionInfo from './connection-reducer.js';
import { reduceDeviceToken } from './device-token-reducer.js';
import reduceLastCommunicatedPlatformDetails from './last-communicated-platform-details-reducer.js';
import reduceUpdatesCurrentAsOf from './updates-reducer.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logInActionTypes,
  resetUserStateActionType,
} from '../actions/user-actions.js';
import type { KeyserverStore } from '../types/keyserver-types';
import type { BaseAction } from '../types/redux-types.js';
import {
  fullStateSyncActionType,
  incrementalStateSyncActionType,
} from '../types/socket-types.js';
import { processUpdatesActionType } from '../types/update-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { setURLPrefix } from '../utils/url-utils.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

export default function reduceKeyserverStore(
  state: KeyserverStore,
  action: BaseAction,
): KeyserverStore {
  // this action is only dispatched on native
  if (action.type === resetUserStateActionType) {
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
    action.type === siweAuthActionTypes.success ||
    action.type === fullStateSyncActionType ||
    action.type === incrementalStateSyncActionType ||
    action.type === processUpdatesActionType
  ) {
    const updatesCurrentAsOf = reduceUpdatesCurrentAsOf(
      state.keyserverInfos[ashoatKeyserverID].updatesCurrentAsOf,
      action,
    );
    state = {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [ashoatKeyserverID]: {
          ...state.keyserverInfos[ashoatKeyserverID],
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
  }

  const lastCommunicatedPlatformDetails = reduceLastCommunicatedPlatformDetails(
    state.keyserverInfos[ashoatKeyserverID].lastCommunicatedPlatformDetails,
    action,
  );
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
    lastCommunicatedPlatformDetails !==
      state.keyserverInfos[ashoatKeyserverID].lastCommunicatedPlatformDetails ||
    deviceToken !== state.keyserverInfos[ashoatKeyserverID].deviceToken
  ) {
    state = {
      ...state,
      keyserverInfos: {
        ...state.keyserverInfos,
        [ashoatKeyserverID]: {
          ...state.keyserverInfos[ashoatKeyserverID],
          connection,
          lastCommunicatedPlatformDetails,
          deviceToken,
        },
      },
    };
  }

  return state;
}
