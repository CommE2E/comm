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

export type TargetedAndroidNotification = {
  +notification: AndroidNotification,
  +deviceToken: string,
};
