// @flow

import { resetUserStateActionType } from '../actions/user-actions.js';
import type { KeyserverStore } from '../types/keyserver-types';
import type { BaseAction } from '../types/redux-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { keyserverPrefixID } from '../utils/validation-utils.js';

export default function reduceKeyserverStore(
  state: KeyserverStore,
  action: BaseAction,
): KeyserverStore {
  // this action is only dispatched on native
  if (action.type === resetUserStateActionType) {
    const stateCookie = state.keyserverInfos[keyserverPrefixID]?.cookie;
    const cookie =
      stateCookie && stateCookie.startsWith('anonymous=') ? stateCookie : null;

    return {
      keyserverInfos: {
        ...state.keyserverInfos,
        [keyserverPrefixID]: {
          ...state.keyserverInfos[keyserverPrefixID],
          cookie,
        },
      },
    };
  } else if (action.type === setNewSessionActionType) {
    if (action.payload.sessionChange.cookie !== undefined) {
      return {
        keyserverInfos: {
          ...state.keyserverInfos,
          [keyserverPrefixID]: {
            ...state.keyserverInfos[keyserverPrefixID],
            cookie: action.payload.sessionChange.cookie,
          },
        },
      };
    }
  }
  return state;
}
