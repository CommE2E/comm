// @flow

import { NativeModules, NativeEventEmitter } from 'react-native';

import type {
  CoreIOSNotificationData,
  CoreIOSNotificationDataWithRequestIdentifier,
} from './comm-ios-notification.js';

type PushPermissions = { alert?: boolean, badge?: boolean, sound?: boolean };

type CommIOSNotificationsConstants = {
  +FETCH_RESULT_NO_DATA: 'UIBackgroundFetchResultNoData',
  +FETCH_RESULT_NEW_DATA: 'UIBackgroundFetchResultNewData',
  +FETCH_RESULT_FAILED: 'UIBackgroundFetchResultFailed',
  +REMOTE_NOTIFICATIONS_REGISTERED_EVENT: 'remoteNotificationsRegistered',
  +REMOTE_NOTIFICATIONS_REGISTRATION_FAILED_EVENT: 'remoteNotificationsRegistrationFailed',
  +NOTIFICATION_RECEIVED_FOREGROUND_EVENT: 'notificationReceivedForeground',
  +NOTIFICATION_OPENED_EVENT: 'notificationOpened',
  +NOTIFICATION_RECEIVED_BACKGROUND_EVENT: 'notificationReceivedBackground',
};

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
  +getConstants: () => CommIOSNotificationsConstants,
  // required since CommIOSNotifications subclasses RCTEventEmitter
  +addListener: (eventName: string) => void,
  +removeListeners: (count: number) => void,
  ...CommIOSNotificationsConstants,
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
    notificationReceivedBackground: [{ +messageInfos: ?string }],
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
