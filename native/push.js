// @flow

import {
  Platform,
  PushNotificationIOS,
  Alert,
} from 'react-native';

import { pluralize } from 'lib/utils/text-utils';

export type PushPermissions = { alert?: bool, badge?: bool, sound?: bool };

let currentlyActive = false;

async function requestPushPermissions() {
  if (currentlyActive) {
    return;
  }
  currentlyActive = true;
  const result = await PushNotificationIOS.requestPermissions();
  currentlyActive = false;
  const missingPermissions = [];
  for (let permission in result) {
    if (result[permission]) {
      continue;
    }
    if (permission === "alert") {
      missingPermissions.push("Banners");
    } else if (permission === "badge") {
      missingPermissions.push("Badges");
    } else if (permission === "sound") {
      missingPermissions.push("Sounds");
    }
  }
  if (missingPermissions.length > 0) {
    const missingString = pluralize(missingPermissions);
    Alert.alert(
      "Need notif permissions",
      "SquadCal needs notification permissions to keep you in the loop! " +
        "Please go to Settings App -> Notifications -> SquadCal. Enable " +
        `${missingString}.`,
      [ { text: 'OK' } ],
    );
  }
}

export {
  requestPushPermissions,
};
