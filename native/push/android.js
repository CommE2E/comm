// @flow

import { NativeModules, NativeEventEmitter } from 'react-native';

import { mergePrefixIntoBody } from 'lib/shared/notif-utils.js';

type CommAndroidNotificationsModuleType = {
  +removeAllActiveNotificationsForThread: (threadID: string) => void,
  +getInitialNotification: () => Promise<?AndroidMessage>,
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
  +requestNotificationsPermission: () => Promise<boolean>,
  +canRequestNotificationsPermissionFromUser: () => Promise<boolean>,
  +NOTIFICATIONS_IMPORTANCE_HIGH: string,
};
export type AndroidMessage = {
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
  message: AndroidMessage,
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
  commAndroidNotificationsMessage: [AndroidMessage],
  commAndroidNotificationsNotificationOpened: [AndroidMessage],
}> {
  return new NativeEventEmitter(CommAndroidNotificationsEventEmitter);
}

export {
  androidNotificationChannelID,
  handleAndroidMessage,
  getCommAndroidNotificationsEventEmitter,
  CommAndroidNotifications,
};
