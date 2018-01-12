// @flow

import NotificationsIOS from 'react-native-notifications';

type PushPermissions = { alert?: bool, badge?: bool, sound?: bool };

let currentlyActive = false;

async function requestIOSPushPermissions(missingDeviceToken: bool) {
  let permissionNeeded = missingDeviceToken;
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
    currentlyActive = false;
  }
  NotificationsIOS.consumeBackgroundQueue();
}

function permissionMissing(permissions: PushPermissions) {
  return !permissions.alert || !permissions.badge || !permissions.sound;
}

export {
  requestIOSPushPermissions,
};
