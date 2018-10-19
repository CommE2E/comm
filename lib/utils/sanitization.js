// @flow

import type {
  BaseAction,
  NativeAppState,
  AppState,
} from '../types/redux-types';
import { setNewSessionActionType } from './action-utils';

function sanitizeAction(action: BaseAction): BaseAction {
  if (action.type === setNewSessionActionType) {
    const { sessionChange } = action.payload;
    if (sessionChange.cookieInvalidated) {
      const { cookie, ...rest } = sessionChange;
      return {
        type: "SET_NEW_SESSION",
        payload: {
          ...action.payload,
          sessionChange: { ...rest },
        },
      };
    } else {
      const { cookie, ...rest } = sessionChange;
      return {
        type: "SET_NEW_SESSION",
        payload: {
          ...action.payload,
          sessionChange: { ...rest },
        },
      };
    }
  }
  return action;
}

function sanitizeState<T>(state: AppState): AppState {
  if (state.cookie !== undefined && state.cookie !== null) {
    return ({ ...state, cookie: null }: NativeAppState);
  }
  return state;
}

export {
  sanitizeAction,
  sanitizeState,
};
