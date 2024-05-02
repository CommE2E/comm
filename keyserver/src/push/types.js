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

type AndroidVisualNotificationPayloadBase = {
  +badge: string,
  +body: string,
  +title: string,
  +prefix?: string,
  +threadID: string,
  +collapseKey?: string,
  +encryptionFailed?: '1',
};

export type AndroidVisualNotificationPayload =
  | {
      ...AndroidVisualNotificationPayloadBase,
      +messageInfos?: string,
    }
  | {
      ...AndroidVisualNotificationPayloadBase,
      +blobHash: string,
      +encryptionKey: string,
    };

export type AndroidVisualNotification = {
  +data: {
    +id?: string,
    +badgeOnly?: '0',
    +keyserverID: string,
    ...AndroidVisualNotificationPayload | { +encryptedPayload: string },
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

export type AndroidBadgeOnlyNotification = {
  +data: {
    +keyserverID: string,
    ...
      | {
          +badge: string,
          +badgeOnly: '1',
        }
      | { +encryptedPayload: string },
  },
};

type AndroidNotificationWithPriority =
  | {
      +notification: AndroidVisualNotification,
      +priority: 'high',
    }
  | {
      +notification: AndroidBadgeOnlyNotification | AndroidNotificationRescind,
      priority: 'normal',
    };

export type TargetedAndroidNotification = {
  ...AndroidNotificationWithPriority,
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
