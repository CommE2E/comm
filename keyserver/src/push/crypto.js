// @flow

import apn from '@parse/node-apn';

import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';

async function encryptIOSNotification(
  cookieID: string,
  notification: apn.Notification,
): Promise<apn.Notification> {
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
    notification.payload.encrypted = 0;
    return notification;
  }

  const { merged, threadID, badge, ...restPayload } = encryptedFields;
  // node-apn library does not allow to store
  // strings in 'badge' property. It will be
  // restored in NSE on the device.
  notification.badge = undefined;
  notification.payload.badge = badge.body;

  if (threadID) {
    notification.threadId = threadID.body;
    notification.payload.threadID = threadID.body;
  }

  if (merged) {
    notification.body = merged.body;
  }

  for (const payloadField in restPayload) {
    notification.payload[payloadField] = restPayload[payloadField].body;
  }

  notification.payload.encrypted = 1;
  return notification;
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

export { prepareEncryptedIOSNotifications };
