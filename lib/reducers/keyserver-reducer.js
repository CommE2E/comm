// @flow

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
    const stateCookie = state.keyserverInfos[ashoatKeyserverID]?.cookie;
    const cookie =
      stateCookie && stateCookie.startsWith('anonymous=') ? stateCookie : null;

    const keyserverInfos = { ...state.keyserverInfos };
    for (const key in keyserverInfos) {
      keyserverInfos[key] = { ...keyserverInfos[key], cookie: null };
    }

    return {
      ...state,
      keyserverInfos: {
        ...keyserverInfos,
        [ashoatKeyserverID]: {
          ...state.keyserverInfos[ashoatKeyserverID],
          cookie,
        },
      },
    };
  } else if (action.type === setNewSessionActionType) {
    if (action.payload.sessionChange.cookie !== undefined) {
      return {
        ...state,
        keyserverInfos: {
          ...state.keyserverInfos,
          [ashoatKeyserverID]: {
            ...state.keyserverInfos[ashoatKeyserverID],
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
    return {
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
  }

  return state;
}
