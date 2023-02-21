// @flow

import { NativeModules, NativeEventEmitter } from 'react-native';

import type {
  CoreIOSNotificationData,
  CoreIOSNotificationDataWithRequestIdentifier,
} from './comm-ios-notification.js';

type PushPermissions = { alert?: boolean, badge?: boolean, sound?: boolean };

type CommIOSNotificationsModuleType = {
  +requestPermissions: () => void,
  +checkPermissions: () => PushPermissions,
  +consumeBackgroundQueue: () => void,
  +setBadgesCount: (count: number) => void,
  +removeAllDeliveredNotifications: () => void,
  +removeDeliveredNotifications: (identifiers: $ReadOnlyArray<string>) => void,
  +getDeliveredNotifications: (
    callback: (
      notifications: $ReadOnlyArray<CoreIOSNotificationDataWithRequestIdentifier>,
    ) => void,
  ) => void,
  +completeNotif: (id: string, fetchResult: string) => void,
  +getConstants: () => { [string]: string },
  // required since CommIOSNotifications subclasses RCTEventEmitter
  +addListener: (eventName: string) => void,
  +removeListeners: (count: number) => void,
  +FETCH_RESULT_NO_DATA: string,
  +FETCH_RESULT_NO_DATA: string,
  +FETCH_RESULT_FAILED: string,
};

const CommIOSNotifications: CommIOSNotificationsModuleType =
  NativeModules.CommIOSNotifications;

let currentlyActive = false;
let firstRun = true;

async function requestIOSPushPermissions(missingDeviceToken: boolean) {
  let permissionNeeded = firstRun || missingDeviceToken;
  firstRun = false;

  if (!permissionNeeded) {
    const permissions: PushPermissions =
      await CommIOSNotifications.checkPermissions();
    permissionNeeded = permissionMissing(permissions);
  }

  if (permissionNeeded) {
    if (currentlyActive) {
      return;
    }
    currentlyActive = true;
    await CommIOSNotifications.requestPermissions();
  }

  CommIOSNotifications.consumeBackgroundQueue();
}

function iosPushPermissionResponseReceived() {
  currentlyActive = false;
}

function permissionMissing(permissions: PushPermissions) {
  return !permissions.alert || !permissions.badge || !permissions.sound;
}

function getCommIOSNotificationsEventEmitter(): NativeEventEmitter<
  $ReadOnly<{
    remoteNotificationsRegistered: [{ +deviceToken: ?string }],
    remoteNotificationsRegistrationFailed: [void],
    notificationReceivedForeground: [CoreIOSNotificationData],
    notificationOpened: [CoreIOSNotificationData],
  }>,
> {
  return new NativeEventEmitter(CommIOSNotifications);
}

export {
  requestIOSPushPermissions,
  iosPushPermissionResponseReceived,
  CommIOSNotifications,
  getCommIOSNotificationsEventEmitter,
};
