// @flow

import { saveMessagesActionType } from 'lib/actions/message-actions';

export const handleURLActionType = 'HANDLE_URL';
export const resetUserStateActionType = 'RESET_USER_STATE';
export const recordNotifPermissionAlertActionType =
  'RECORD_NOTIF_PERMISSION_ALERT';
export const recordAndroidNotificationActionType =
  'RECORD_ANDROID_NOTIFICATION';
export const clearAndroidNotificationsActionType =
  'CLEAR_ANDROID_NOTIFICATIONS';
export const rescindAndroidNotificationActionType =
  'RESCIND_ANDROID_NOTIFICATION';
export const updateDimensionsActiveType = 'UPDATE_DIMENSIONS';
export const updateConnectivityActiveType = 'UPDATE_CONNECTIVITY';
export const updateThemeInfoActionType = 'UPDATE_THEME_INFO';
export const updateDeviceCameraInfoActionType = 'UPDATE_DEVICE_CAMERA_INFO';
export const updateDeviceOrientationActionType = 'UPDATE_DEVICE_ORIENTATION';

export const backgroundActionTypes: Set<string> = new Set([
  saveMessagesActionType,
  recordAndroidNotificationActionType,
  rescindAndroidNotificationActionType,
]);
