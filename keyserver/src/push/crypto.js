// @flow

import apn from '@parse/node-apn';
import _cloneDeep from 'lodash/fp/cloneDeep.js';

import type { AndroidNotification } from './types.js';
import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';

async function encryptIOSNotification(
  cookieID: string,
  notification: apn.Notification,
): Promise<apn.Notification> {
  const encryptedNotification = _cloneDeep(notification);
  const { id, ...payloadSansId } = notification.payload;
  let notificationFieldsToEncrypt = {
    badge: notification.aps.badge.toString(),
    ...payloadSansId,
  };

  if (notification.body) {
    notificationFieldsToEncrypt = {
      merged: notification.body,
      ...notificationFieldsToEncrypt,
    };
  }

  let encryptedFields;
  try {
    encryptedFields = await encryptAndUpdateOlmSession(
      cookieID,
      'notifications',
      notificationFieldsToEncrypt,
    );
  } catch (e) {
    console.log('Notification encryption failed: ' + e);
    encryptedNotification.payload.encrypted = 0;
    return encryptedNotification;
  }

  const { merged, threadID, badge, ...restPayload } = encryptedFields;
  // node-apn library does not allow to store
  // strings in 'badge' property. It will be
  // restored in NSE on the device.
  encryptedNotification.badge = undefined;
  encryptedNotification.payload.badge = badge.body;

  if (threadID) {
    encryptedNotification.threadId = threadID.body;
    encryptedNotification.payload.threadID = threadID.body;
  }

  if (merged) {
    encryptedNotification.body = merged.body;
  }

  for (const payloadField in restPayload) {
    encryptedNotification.payload[payloadField] =
      restPayload[payloadField].body;
  }

  encryptedNotification.payload.encrypted = 1;
  return notification;
}

async function encryptAndroidNotification(
  cookieID: string,
  notification: AndroidNotification,
): Promise<AndroidNotification> {
  const encryptedNotification = { ...notification };
  const {
    data: { id, badgeOnly, ...notificationFieldsToEncrypt },
  } = encryptedNotification;

  let encryptedFields;
  try {
    encryptedFields = await encryptAndUpdateOlmSession(
      cookieID,
      'notifications',
      notificationFieldsToEncrypt,
    );
  } catch (e) {
    console.log('Notification encryption failed: ' + e);
    encryptedNotification.data.encrypted = '0';
    return encryptedNotification;
  }

  for (const fieldName in encryptedFields) {
    encryptedNotification.data[fieldName] = encryptedFields[fieldName].body;
  }
  encryptedNotification.data.encrypted = '1';
  return encryptedNotification;
}

function prepareEncryptedIOSNotifications(
  cookieIDs: $ReadOnlyArray<string>,
  notification: apn.Notification,
): Promise<Array<apn.Notification>> {
  const notificationPromises = cookieIDs.map(cookieID =>
    encryptIOSNotification(cookieID, notification),
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedAndroidNotifications(
  cookieIDs: $ReadOnlyArray<string>,
  notification: AndroidNotification,
): Promise<Array<AndroidNotification>> {
  const notificationPromises = cookieIDs.map(cookieID =>
    encryptAndroidNotification(cookieID, notification),
  );
  return Promise.all(notificationPromises);
}

export {
  prepareEncryptedIOSNotifications,
  prepareEncryptedAndroidNotifications,
};
