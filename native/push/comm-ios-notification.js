// @flow

import { NativeModules } from 'react-native';

import type { RawMessageInfo } from 'lib/types/message-types.js';

const { CommIOSNotifications } = NativeModules;

// This is the basic data we receive from Objective-C
// Its keys are explained as follow:
// `id` - unique ID generated by keyserver
// `message` - comes from `alert` property of raw Apple payload
// which carries displayable content of the notification
// `body` and `title` - actual content of the
// message and sender name respectively
export type CoreIOSNotificationData = {
  +id: string,
  +message: ?string,
  +threadID: string,
  +title: ?string,
  +messageInfos: ?string,
  +body: ?string,
  +prefix?: string,
};

// Objective-C can also include notification request identifier
// associated with certain notification so that we can interact
// with notification center from JS. Read for explanation:
// https://developer.apple.com/documentation/usernotifications/unnotificationrequest?language=objc
export type CoreIOSNotificationDataWithRequestIdentifier = {
  ...CoreIOSNotificationData,
  +identifier: string,
};

export type ParsedCoreIOSNotificationData = {
  ...CoreIOSNotificationData,
  +messageInfos: ?$ReadOnlyArray<RawMessageInfo>,
};

export class CommIOSNotification {
  data: ParsedCoreIOSNotificationData;
  remoteNotificationCompleteCallbackCalled: boolean;

  constructor(notification: CoreIOSNotificationData) {
    this.remoteNotificationCompleteCallbackCalled = false;
    const { messageInfos } = notification;
    this.data = {
      ...notification,
      messageInfos: messageInfos ? JSON.parse(messageInfos) : null,
    };
  }

  getMessage(): ?string {
    return this.data.message;
  }

  getData(): ParsedCoreIOSNotificationData {
    return this.data;
  }

  finish(fetchResult: string) {
    if (!this.data.id || this.remoteNotificationCompleteCallbackCalled) {
      return;
    }
    CommIOSNotifications.completeNotif(this.data.id, fetchResult);
    this.remoteNotificationCompleteCallbackCalled = true;
  }
}
