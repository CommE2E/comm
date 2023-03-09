// @flow

import type { Orientations } from 'react-native-orientation-locker';

import { saveMessagesActionType } from 'lib/actions/message-actions.js';
import type { Shape } from 'lib/types/core.js';
import type { BaseAction } from 'lib/types/redux-types.js';

import type { DimensionsInfo } from './dimensions-updater.react.js';
import type { AppState } from './state-types.js';
import type { DeviceCameraInfo } from '../types/camera.js';
import type { ConnectivityInfo } from '../types/connectivity.js';
import type { GlobalThemeInfo } from '../types/themes.js';

export const resetUserStateActionType = 'RESET_USER_STATE';
export const updateDimensionsActiveType = 'UPDATE_DIMENSIONS';
export const updateConnectivityActiveType = 'UPDATE_CONNECTIVITY';
export const updateThemeInfoActionType = 'UPDATE_THEME_INFO';
export const updateDeviceCameraInfoActionType = 'UPDATE_DEVICE_CAMERA_INFO';
export const updateDeviceOrientationActionType = 'UPDATE_DEVICE_ORIENTATION';
export const updateThreadLastNavigatedActionType =
  'UPDATE_THREAD_LAST_NAVIGATED';
export const setStoreLoadedActionType = 'SET_STORE_LOADED';
export const setReduxStateActionType = 'SET_REDUX_STATE';

export const backgroundActionTypes: Set<string> = new Set([
  saveMessagesActionType,
]);

export type Action =
  | BaseAction
  | {
      +type: 'SET_REDUX_STATE',
      +payload: { +state: AppState, +hideFromMonitor: boolean },
    }
  | {
      +type: 'SET_CUSTOM_SERVER',
      +payload: string,
    }
  | { +type: 'RESET_USER_STATE' }
  | {
      +type: 'UPDATE_DIMENSIONS',
      +payload: Shape<DimensionsInfo>,
    }
  | {
      +type: 'UPDATE_CONNECTIVITY',
      +payload: ConnectivityInfo,
    }
  | {
      +type: 'UPDATE_THEME_INFO',
      +payload: Shape<GlobalThemeInfo>,
    }
  | {
      +type: 'UPDATE_DEVICE_CAMERA_INFO',
      +payload: Shape<DeviceCameraInfo>,
    }
  | {
      +type: 'UPDATE_DEVICE_ORIENTATION',
      +payload: Orientations,
    }
  | {
      +type: 'UPDATE_THREAD_LAST_NAVIGATED',
      +payload: { +threadID: string, +time: number },
    }
  | {
      +type: 'SET_STORE_LOADED',
    };
