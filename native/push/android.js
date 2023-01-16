// @flow

import invariant from 'invariant';
import { NativeModules, NativeEventEmitter } from 'react-native';
import type { RemoteMessage } from 'react-native-firebase';

import { mergePrefixIntoBody } from 'lib/shared/notif-utils';

type CommAndroidNotificationsModuleType = {
  +removeAllActiveNotificationsForThread: (threadID: string) => void,
  ...
};

const { CommAndroidNotificationsEventEmitter } = NativeModules;
const CommAndroidNotifications: CommAndroidNotificationsModuleType =
  NativeModules.CommAndroidNotifications;
const androidNotificationChannelID = 'default';

function handleAndroidMessage(
  message: RemoteMessage,
  updatesCurrentAsOf: number,
  handleIfActive?: (
    threadID: string,
    texts: { body: string, title: ?string },
  ) => boolean,
) {
  const { data } = message;

  const { rescind, rescindID } = data;
  if (rescind) {
    invariant(rescindID, 'rescind message without notifID');
    return;
  }

  const { title, prefix, threadID } = data;
  let { body } = data;
  ({ body } = mergePrefixIntoBody({ body, title, prefix }));

  if (handleIfActive) {
    const texts = { title, body };
    const isActive = handleIfActive(threadID, texts);
    if (isActive) {
      return;
    }
  }
}
function getCommAndroidNotificationsEventEmitter(): NativeEventEmitter<{
  commAndroidNotificationsToken: [string],
}> {
  return new NativeEventEmitter(CommAndroidNotificationsEventEmitter);
}

export {
  androidNotificationChannelID,
  handleAndroidMessage,
  getCommAndroidNotificationsEventEmitter,
  CommAndroidNotifications,
};
