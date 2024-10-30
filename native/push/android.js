// @flow

import { NativeModules, NativeEventEmitter } from 'react-native';

import { mergePrefixIntoBody } from 'lib/shared/notif-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';

type CommAndroidNotificationsConstants = {
  +NOTIFICATIONS_IMPORTANCE_HIGH: number,
  +COMM_ANDROID_NOTIFICATIONS_TOKEN: 'commAndroidNotificationsToken',
  +COMM_ANDROID_NOTIFICATIONS_MESSAGE: 'commAndroidNotificationsMessage',
  +COMM_ANDROID_NOTIFICATIONS_NOTIFICATION_OPENED: 'commAndroidNotificationsNotificationOpened',
};

type CommAndroidNotificationsModuleType = {
  +removeAllActiveNotificationsForThread: (threadID: string) => void,
  +getInitialNotificationThreadID: () => Promise<?string>,
  +createChannel: (
    channelID: string,
    name: string,
    importance: number,
    description: ?string,
  ) => void,
  +getConstants: () => CommAndroidNotificationsConstants,
  +setBadge: (count: number) => void,
  +removeAllDeliveredNotifications: () => void,
  +hasPermission: () => Promise<boolean>,
  +getToken: () => Promise<string>,
  +requestNotificationsPermission: () => Promise<boolean>,
  +canRequestNotificationsPermissionFromUser: () => Promise<boolean>,
  ...CommAndroidNotificationsConstants,
};
export type AndroidMessage = {
  +body: string,
  +title: string,
  +threadID: string,
  +prefix?: string,
  +messageInfos: ?string,
};

export type ParsedAndroidMessage = {
  ...AndroidMessage,
  +messageInfos: ?$ReadOnlyArray<RawMessageInfo>,
};

function parseAndroidMessage(message: AndroidMessage): ParsedAndroidMessage {
  const { messageInfos } = message;
  return {
    ...message,
    messageInfos: messageInfos ? JSON.parse(messageInfos) : null,
  };
}

const { CommAndroidNotificationsEventEmitter } = NativeModules;
const CommAndroidNotifications: CommAndroidNotificationsModuleType =
  NativeModules.CommAndroidNotifications;
const androidNotificationChannelID = 'default';

function handleAndroidMessage(
  message: ParsedAndroidMessage,
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
  commAndroidNotificationsNotificationOpened: [string],
}> {
  return new NativeEventEmitter(CommAndroidNotificationsEventEmitter);
}

export {
  parseAndroidMessage,
  androidNotificationChannelID,
  handleAndroidMessage,
  getCommAndroidNotificationsEventEmitter,
  CommAndroidNotifications,
};
