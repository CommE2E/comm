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
  encryptedNotification.mutableContent = true;

  const { id, ...payloadSansId } = notification.payload;
  const unencryptedPayload = {
    ...payloadSansId,
    badge: notification.aps.badge.toString(),
    merged: notification.body,
  };

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

    encryptedNotification.body = notification.body;
    encryptedNotification.threadId = notification.payload.threadID;
    invariant(
      typeof notification.aps.badge === 'number',
      'Unencrypted notification must have badge as a number',
    );
    encryptedNotification.badge = notification.aps.badge;

    encryptedNotification.payload = {
      ...encryptedNotification.payload,
      ...notification.payload,
      encryptionFailed: 1,
    };
    return encryptedNotification;
  }

  encryptedNotification.payload.encryptedPayload =
    encryptedSerializedPayload.body;
  return encryptedNotification;
}

async function encryptAndroidNotification(
  cookieID: string,
  notification: AndroidNotification,
): Promise<AndroidNotification> {
  const { id, badgeOnly, ...unencryptedPayload } = notification.data;
  const encryptedNotification = { data: { id, badgeOnly } };

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
      ...unencryptedPayload,
      ...encryptedNotification.data,
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
