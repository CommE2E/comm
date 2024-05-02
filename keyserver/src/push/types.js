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

export type AndroidVisualNotificationPayloadBase = $ReadOnly<{
  +badge: string,
  +body: string,
  +title: string,
  +prefix?: string,
  +threadID: string,
  +collapseKey?: string,
  +badgeOnly?: '0',
  +encryptionFailed?: '1',
}>;

export type AndroidVisualNotificationPayload = $ReadOnly<
  | {
      ...AndroidVisualNotificationPayloadBase,
      +messageInfos?: string,
    }
  | {
      ...AndroidVisualNotificationPayloadBase,
      +blobHash: string,
      +encryptionKey: string,
    },
>;

export type AndroidVisualNotification = {
  +data: $ReadOnly<{
    +id?: string,
    +keyserverID: string,
    ...
      | {
          ...AndroidVisualNotificationPayloadBase,
          +messageInfos?: string,
        }
      | {
          ...AndroidVisualNotificationPayloadBase,
          +blobHash: string,
          +encryptionKey: string,
        }
      | { +encryptedPayload: string },
  }>,
};

export type AndroidNotificationRescind = {
  +data: $ReadOnly<{
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
  }>,
};

export type AndroidBadgeOnlyNotification = {
  +data: $ReadOnly<{
    +keyserverID: string,
    ...
      | {
          +badge: string,
          +badgeOnly: '1',
          +encryptionFailed?: string,
        }
      | { +encryptedPayload: string },
  }>,
};

type AndroidNotificationWithPriority =
  | {
      +notification: AndroidVisualNotification,
      +priority: 'high',
    }
  | {
      +notification: AndroidBadgeOnlyNotification | AndroidNotificationRescind,
      +priority: 'normal',
    };

export type TargetedAndroidNotification = $ReadOnly<{
  ...AndroidNotificationWithPriority,
  +deviceToken: string,
  +encryptionOrder?: number,
}>;

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
