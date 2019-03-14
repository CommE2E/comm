// @flow

import NotificationsIOS from 'react-native-notifications';

type PushPermissions = { alert?: bool, badge?: bool, sound?: bool };

let currentlyActive = false;
let firstRun = true;

async function requestIOSPushPermissions(missingDeviceToken: bool) {
  let permissionNeeded = firstRun || missingDeviceToken;
  firstRun = false;

  if (!permissionNeeded) {
    const permissions: PushPermissions =
      await NotificationsIOS.checkPermissions();
    permissionNeeded = permissionMissing(permissions);
  }

  if (permissionNeeded) {
    if (currentlyActive) {
      return;
    }
    currentlyActive = true;
    await NotificationsIOS.requestPermissions();
  }

  NotificationsIOS.consumeBackgroundQueue();
}

function iosPushPermissionResponseReceived() {
  currentlyActive = false;
}

function permissionMissing(permissions: PushPermissions) {
  return !permissions.alert || !permissions.badge || !permissions.sound;
}

export {
  requestIOSPushPermissions,
  iosPushPermissionResponseReceived,
};
