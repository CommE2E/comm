// @flow

import apn from '@parse/node-apn';

export type TargetedAPNsNotification = {
  +notification: apn.Notification,
  +deviceToken: string,
};

export type AndroidNotification = {
  +data: {
    +id?: string,
    +badgeOnly?: string,
    +[string]: string,
  },
};

export type AndroidNotificationRescind = {
  +data: {
    +[string]: string,
  },
};

export type TargetedAndroidNotification = {
  +notification: AndroidNotification | AndroidNotificationRescind,
  +deviceToken: string,
};

export type NotificationTargetDevice = {
  +cookieID: string,
  +deviceToken: string,
};
