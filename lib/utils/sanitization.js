// @flow

import { setDeviceTokenActionTypes } from '../actions/device-actions';
import type {
  BaseAction,
  NativeAppState,
  AppState,
} from '../types/redux-types';
import { setNewSessionActionType } from './action-utils';

function sanitizeActionSecrets(action: BaseAction): BaseAction {
  if (action.type === setNewSessionActionType) {
    const { sessionChange } = action.payload;
    if (sessionChange.cookieInvalidated) {
      const { cookie, ...rest } = sessionChange;
      return {
        type: 'SET_NEW_SESSION',
        payload: {
          ...action.payload,
          sessionChange: { cookieInvalidated: true, ...rest },
        },
      };
    } else {
      const { cookie, ...rest } = sessionChange;
      return {
        type: 'SET_NEW_SESSION',
        payload: {
          ...action.payload,
          sessionChange: { cookieInvalidated: false, ...rest },
        },
      };
    }
  } else if (
    action.type === setDeviceTokenActionTypes.started &&
    action.payload
  ) {
    return ({
      type: 'SET_DEVICE_TOKEN_STARTED',
      payload: 'FAKE',
      loadingInfo: action.loadingInfo,
    }: any);
  } else if (action.type === setDeviceTokenActionTypes.success) {
    return {
      type: 'SET_DEVICE_TOKEN_SUCCESS',
      payload: 'FAKE',
      loadingInfo: action.loadingInfo,
    };
  }
  return action;
}

function sanitizeState(state: AppState): AppState {
  if (state.cookie !== undefined && state.cookie !== null) {
    const oldState: NativeAppState = state;
    state = { ...oldState, cookie: null };
  }
  if (state.deviceToken !== undefined && state.deviceToken !== null) {
    const oldState: NativeAppState = state;
    state = { ...oldState, deviceToken: null };
  }
  return state;
}

export { sanitizeActionSecrets, sanitizeState };
