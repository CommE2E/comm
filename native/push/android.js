// @flow

import invariant from 'invariant';
import { NativeModules } from 'react-native';
import type { RemoteMessage } from 'react-native-firebase';

import { mergePrefixIntoBody } from 'lib/shared/notif-utils';

import { store } from '../redux/redux-setup';
import { getFirebase } from './firebase';

type CommAndroidNotificationsModuleType = {
  +removeAllActiveNotificationsForThread: (threadID: string) => void,
  ...
};

const CommAndroidNotifications: CommAndroidNotificationsModuleType =
  NativeModules.CommAndroidNotifications;
const androidNotificationChannelID = 'default';
const vibrationSpec = [500, 500];

function handleAndroidMessage(
  message: RemoteMessage,
  updatesCurrentAsOf: number,
  handleIfActive?: (
    threadID: string,
    texts: { body: string, title: ?string },
  ) => boolean,
) {
  const firebase = getFirebase();
  const { data } = message;

  const { rescind, rescindID } = data;
  if (rescind) {
    invariant(rescindID, 'rescind message without notifID');
    return;
  }

  const { id, title, prefix, threadID } = data;
  let { body } = data;
  ({ body } = mergePrefixIntoBody({ body, title, prefix }));

  if (handleIfActive) {
    const texts = { title, body };
    const isActive = handleIfActive(threadID, texts);
    if (isActive) {
      return;
    }
  }

  const notification = new firebase.notifications.Notification()
    .setNotificationId(id)
    .setBody(body)
    .setData({ threadID })
    .android.setTag(id)
    .android.setChannelId(androidNotificationChannelID)
    .android.setDefaults([firebase.notifications.Android.Defaults.All])
    .android.setVibrate(vibrationSpec)
    .android.setAutoCancel(true)
    .android.setLargeIcon('@mipmap/ic_launcher')
    .android.setSmallIcon('@drawable/notif_icon');
  if (title) {
    notification.setTitle(title);
  }
  firebase.notifications().displayNotification(notification);
}

async function androidBackgroundMessageTask(message: RemoteMessage) {
  const { updatesCurrentAsOf } = store.getState();
  handleAndroidMessage(message, updatesCurrentAsOf);
}

export {
  androidNotificationChannelID,
  handleAndroidMessage,
  androidBackgroundMessageTask,
  CommAndroidNotifications,
};
