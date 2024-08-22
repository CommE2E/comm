// @flow

import type { Orientations } from 'react-native-orientation-locker';

import { saveMessagesActionType } from 'lib/actions/message-actions.js';
import type { BaseAction, DispatchMetadata } from 'lib/types/redux-types.js';

import type { DimensionsInfo } from './dimensions-updater.react.js';
import type { AppState } from './state-types.js';
import type { DeviceCameraInfo } from '../types/camera.js';
import type { ConnectivityInfo } from '../types/connectivity.js';
import type { LocalSettings } from '../types/local-settings-types.js';

export const updateDimensionsActiveType = 'UPDATE_DIMENSIONS';
export const updateConnectivityActiveType = 'UPDATE_CONNECTIVITY';
export const updateDeviceCameraInfoActionType = 'UPDATE_DEVICE_CAMERA_INFO';
export const updateDeviceOrientationActionType = 'UPDATE_DEVICE_ORIENTATION';
export const setStoreLoadedActionType = 'SET_STORE_LOADED';
export const setReduxStateActionType = 'SET_REDUX_STATE';
export const setLocalSettingsActionType = 'SET_LOCAL_SETTINGS';
export const setAccessTokenActionType = 'SET_ACCESS_TOKEN';

export const backgroundActionTypes: Set<string> = new Set([
  saveMessagesActionType,
]);

export type Action = $ReadOnly<
  | BaseAction
  | {
      +dispatchMetadata?: DispatchMetadata,
      ...
        | {
            +type: 'SET_REDUX_STATE',
            +payload: { +state: AppState, +hideFromMonitor: boolean },
          }
        | {
            +type: 'UPDATE_DIMENSIONS',
            +payload: Partial<DimensionsInfo>,
          }
        | {
            +type: 'UPDATE_CONNECTIVITY',
            +payload: ConnectivityInfo,
          }
        | {
            +type: 'UPDATE_DEVICE_CAMERA_INFO',
            +payload: Partial<DeviceCameraInfo>,
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
          }
        | { +type: 'SET_LOCAL_SETTINGS', +payload: LocalSettings }
        | { +type: 'SET_ACCESS_TOKEN', +payload: ?string },
    },
>;
