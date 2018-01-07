// @flow

import NotificationsIOS from 'react-native-notifications';

export type PushPermissions = { alert?: bool, badge?: bool, sound?: bool };

let currentlyActive = false;

async function requestIOSPushPermissions() {
  if (currentlyActive) {
    return;
  }
  currentlyActive = true;
  await NotificationsIOS.requestPermissions([]);
  currentlyActive = false;
}

export {
  requestIOSPushPermissions,
};
