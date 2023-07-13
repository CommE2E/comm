// @flow

import { resetUserStateActionType } from '../actions/user-actions.js';
import type { KeyserverStore } from '../types/keyserver-types';
import type { BaseAction } from '../types/redux-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
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
  }
  return state;
}
