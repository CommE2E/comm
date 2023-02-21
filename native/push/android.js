// @flow

import { NativeModules, NativeEventEmitter } from 'react-native';

import { mergePrefixIntoBody } from 'lib/shared/notif-utils.js';

type CommAndroidNotificationsModuleType = {
  +removeAllActiveNotificationsForThread: (threadID: string) => void,
  +getInitialNotification: () => Promise<?AndroidForegroundMessage>,
  +createChannel: (
    channelID: string,
    name: string,
    importance: number,
    description: ?string,
  ) => void,
  +getConstants: () => { +NOTIFICATIONS_IMPORTANCE_HIGH: number, ... },
  +setBadge: (count: number) => void,
  +removeAllDeliveredNotifications: () => void,
  +hasPermission: () => Promise<boolean>,
  +getToken: () => Promise<string>,
  +NOTIFICATIONS_IMPORTANCE_HIGH: string,
};
export type AndroidForegroundMessage = {
  +body: string,
  +title: string,
  +threadID: string,
  +prefix?: string,
  +messageInfos: ?string,
};

const { CommAndroidNotificationsEventEmitter } = NativeModules;
const CommAndroidNotifications: CommAndroidNotificationsModuleType =
  NativeModules.CommAndroidNotifications;
const androidNotificationChannelID = 'default';

function handleAndroidMessage(
  message: AndroidForegroundMessage,
  updatesCurrentAsOf: number,
  handleIfActive?: (
    threadID: string,
    texts: { body: string, title: ?string },
  ) => boolean,
) {
  const { title, prefix, threadID } = message;
  let { body } = message;
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
  commAndroidNotificationsForegroundMessage: [AndroidForegroundMessage],
  commAndroidNotificationsNotificationOpened: [AndroidForegroundMessage],
}> {
  return new NativeEventEmitter(CommAndroidNotificationsEventEmitter);
}

export {
  androidNotificationChannelID,
  handleAndroidMessage,
  getCommAndroidNotificationsEventEmitter,
  CommAndroidNotifications,
};
