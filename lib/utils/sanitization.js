// @flow

import type {
  BaseAction,
  NativeAppState,
  AppState,
} from '../types/redux-types';
import { setNewSessionActionType } from './action-utils';
import { setDeviceTokenActionTypes } from '../actions/device-actions';

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
  } else if (action.type === setDeviceTokenActionTypes.started) {
    return {
      type: "SET_DEVICE_TOKEN_STARTED",
      payload: "FAKE",
      loadingInfo: action.loadingInfo,
    };
  } else if (action.type === setDeviceTokenActionTypes.success) {
    return {
      type: "SET_DEVICE_TOKEN_SUCCESS",
      payload: "FAKE",
      loadingInfo: action.loadingInfo,
    };
  }
  return action;
}

function sanitizeState<T>(state: AppState): AppState {
  if (state.cookie !== undefined && state.cookie !== null) {
    state = ({ ...state, cookie: null }: NativeAppState);
  }
  if (state.deviceToken !== undefined && state.deviceToken !== null) {
    state = ({ ...state, deviceToken: null }: NativeAppState);
  }
  return state;
}

export {
  sanitizeAction,
  sanitizeState,
};
