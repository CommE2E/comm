// @flow

import apn from '@parse/node-apn';

export type TargetedAPNsNotification = {
  +notification: apn.Notification,
  +deliveryID: string,
  +encryptedPayloadHash?: string,
  +encryptionOrder?: number,
};
