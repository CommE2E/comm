// @flow

import apn from '@parse/node-apn';

export type TargetedAPNsNotification = {
  +notification: apn.Notification,
  +deviceToken: string,
};

type AndroidNotificationPayload = {
  +badge: string,
  +body?: string,
  +title?: string,
  +prefix?: string,
  +threadID?: string,
  +messageInfos?: string,
  +encryptionFailed?: '1',
};

export type AndroidNotification = {
  +data: {
    +id?: string,
    +badgeOnly?: string,
    ...AndroidNotificationPayload | { +encryptedPayload: string },
  },
};

export type AndroidNotificationRescind = {
  +data:
    | {
        +badge: string,
        +rescind: 'true',
        +rescindID: string,
        +setUnreadStatus: 'true',
        +threadID: string,
        +encryptionFailed?: string,
      }
    | { +encryptedPayload: string },
};

export type TargetedAndroidNotification = {
  +notification: AndroidNotification | AndroidNotificationRescind,
  +deviceToken: string,
};

export type NotificationTargetDevice = {
  +cookieID: string,
  +deviceToken: string,
};
