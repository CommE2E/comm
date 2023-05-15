// @flow
import apn from '@parse/node-apn';

import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';

async function encryptIOSNotification(
  cookieID: string,
  notification: apn.Notification,
): Promise<apn.Notification> {
  let encryptedBody,
    encryptedThreadID,
    encryptedMessageInfos,
    encryptedUnreadCount;

  try {
    [
      encryptedBody,
      encryptedThreadID,
      encryptedMessageInfos,
      encryptedUnreadCount,
    ] = await encryptAndUpdateOlmSession(cookieID, 'notifications', [
      notification.body,
      notification.payload.threadID,
      notification.payload.messageInfos,
      notification.payload.badge.toString(),
    ]);
  } catch (e) {
    console.log('Notification encryption failed: ' + e);
    notification.payload.encrypted = 'false';
    return notification;
  }

  notification.body = encryptedBody.body;
  notification.threadId = encryptedThreadID.body;
  notification.payload.threadID = encryptedThreadID.body;
  notification.payload.messageInfos = encryptedMessageInfos.body;
  notification.payload.badge = encryptedUnreadCount.body;
  notification.payload.encrypted = 'true';
  return notification;
}

async function prepareEncryptedIOSNotifications(
  cookieIDs: $ReadOnlyArray<string>,
  notification: apn.Notification,
): Promise<$ReadOnlyArray<apn.Notification>> {
  const notificationPromises = cookieIDs.map(cookieID => {
    return encryptIOSNotification(cookieID, notification);
  });
  return Promise.all(notificationPromises);
}

export { encryptIOSNotification, prepareEncryptedIOSNotifications };
