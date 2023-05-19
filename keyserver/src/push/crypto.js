// @flow

import apn from '@parse/node-apn';
import invariant from 'invariant';

import type { AndroidNotification } from './types.js';
import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';

async function encryptIOSNotification(
  cookieID: string,
  notification: apn.Notification,
): Promise<apn.Notification> {
  invariant(
    !notification.collapseId,
    'Collapsible notifications encryption currently not implemented',
  );

  const encryptedNotification = new apn.Notification();

  encryptedNotification.id = notification.id;
  encryptedNotification.payload.id = notification.id;
  encryptedNotification.topic = notification.topic;
  encryptedNotification.sound = notification.aps.sound;
  encryptedNotification.pushType = 'alert';

  invariant(
    notification.aps['mutable-content'],
    'Notification decryption impossible without mutableContent set to true',
  );
  encryptedNotification.mutableContent = true;

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

    encryptedNotification.body = notification.aps.alert;

    invariant(
      typeof notification.aps.badge === 'number',
      'Unencrypted notification must have badge as a number',
    );
    encryptedNotification.badge = notification.aps.badge;

    encryptedNotification.threadId = notification.aps['thread-id'];
    encryptedNotification.payload = {
      ...encryptedNotification.payload,
      ...notification.payload,
      encrypted: 0,
    };
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
  return encryptedNotification;
}

async function encryptAndroidNotification(
  cookieID: string,
  notification: AndroidNotification,
): Promise<AndroidNotification> {
  const encryptedNotification = {
    data: {
      id: notification.data.id,
      badgeOnly: notification.data.badgeOnly,
    },
  };

  const {
    data: { id, badgeOnly, ...unencryptedPayload },
  } = notification;

  let encryptedSerializedPayload;
  try {
    const unencryptedSerializedPayload = JSON.stringify(unencryptedPayload);
    const { serializedPayload } = await encryptAndUpdateOlmSession(
      cookieID,
      'notifications',
      {
        serializedPayload: unencryptedSerializedPayload,
      },
    );
    encryptedSerializedPayload = serializedPayload;
  } catch (e) {
    console.log('Notification encryption failed: ' + e);

    encryptedNotification.data = {
      ...encryptedNotification.data,
      ...unencryptedPayload,
      encryptionFailed: '1',
    };
    return encryptedNotification;
  }

  encryptedNotification.data = {
    ...encryptedNotification.data,
    encryptedPayload: encryptedSerializedPayload.body,
  };
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
