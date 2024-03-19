// @flow

import apn from '@parse/node-apn';

import type {
  WebNotification,
  WNSNotification,
} from 'lib/types/notif-types.js';

export type TargetedAPNsNotification = {
  +notification: apn.Notification,
  +deviceToken: string,
  +encryptedPayloadHash?: string,
  +encryptionOrder?: number,
};

type AndroidNotificationPayloadBase = {
  +badge: string,
  +body?: string,
  +title?: string,
  +prefix?: string,
  +threadID?: string,
  +collapseKey?: string,
  +encryptionFailed?: '1',
};

export type AndroidNotificationPayload =
  | {
      ...AndroidNotificationPayloadBase,
      +messageInfos?: string,
    }
  | {
      ...AndroidNotificationPayloadBase,
      +blobHash: string,
      +encryptionKey: string,
    };

export type AndroidNotification = {
  +data: {
    +id?: string,
    +badgeOnly?: string,
    +keyserverID: string,
    ...AndroidNotificationPayload | { +encryptedPayload: string },
  },
};

export type AndroidNotificationRescind = {
  +data: {
    +keyserverID: string,
    ...
      | {
          +badge: string,
          +rescind: 'true',
          +rescindID: string,
          +setUnreadStatus: 'true',
          +threadID: string,
          +encryptionFailed?: string,
        }
      | { +encryptedPayload: string },
  },
};

export type TargetedAndroidNotification = {
  +notification: AndroidNotification | AndroidNotificationRescind,
  +deviceToken: string,
  +encryptionOrder?: number,
};

export type TargetedWebNotification = {
  +notification: WebNotification,
  +deviceToken: string,
  +encryptionOrder?: number,
};

export type TargetedWNSNotification = {
  +notification: WNSNotification,
  +deviceToken: string,
  +encryptionOrder?: number,
};

export type NotificationTargetDevice = {
  +cookieID: string,
  +deviceToken: string,
  +blobHolder?: string,
};
