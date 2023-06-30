// @flow

import { NativeModules, NativeEventEmitter } from 'react-native';

import { convertRawMessageInfoToNewIDSchema } from 'lib/_generated/migration-utils.js';
import { mergePrefixIntoBody } from 'lib/shared/notif-utils.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import { keyserverPrefixID } from 'lib/utils/validation-utils.js';

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
  let threadID = message.threadID;
  let messageInfos: ?$ReadOnlyArray<RawMessageInfo> = null;
  if (message.messageInfos) {
    messageInfos = JSON.parse(message.messageInfos);
  }

  if (threadID.indexOf('|') === -1) {
    threadID = `${keyserverPrefixID}|${threadID}`;
    messageInfos = messageInfos?.map(convertRawMessageInfoToNewIDSchema);
  }

  return {
    ...message,
    threadID,
    messageInfos,
  };
}

const { CommAndroidNotificationsEventEmitter } = NativeModules;
const CommAndroidNotifications: CommAndroidNotificationsModuleType =
  NativeModules.CommAndroidNotifications;
const androidNotificationChannelID = 'default';

function handleAndroidMessage(
  message: ParsedAndroidMessage,
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
