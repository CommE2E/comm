// @flow

import apn from '@parse/node-apn';
import type { ResponseFailure } from '@parse/node-apn';
import type { FirebaseError } from 'firebase-admin';
import invariant from 'invariant';

import { createAndroidNotificationRescind } from 'lib/push/android-notif-creators.js';
import { getAPNsNotificationTopic } from 'lib/shared/notif-utils.js';
import type { PlatformDetails } from 'lib/types/device-types.js';
import type {
  NotificationTargetDevice,
  TargetedAndroidNotification,
  SenderDeviceDescriptor,
  EncryptedNotifUtilsAPI,
} from 'lib/types/notif-types.js';
import { threadSubscriptions } from 'lib/types/subscription-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { promiseAll } from 'lib/utils/promises.js';
import { tID } from 'lib/utils/validation-utils.js';

import { prepareEncryptedIOSNotificationRescind } from './crypto.js';
import encryptedNotifUtilsAPI from './encrypted-notif-utils-api.js';
import type { TargetedAPNsNotification } from './types.js';
import {
  apnPush,
  fcmPush,
  type APNPushResult,
  type FCMPushResult,
} from './utils.js';
import createIDs from '../creators/id-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import type { SQLStatementType } from '../database/types.js';
import { thisKeyserverID } from '../user/identity.js';
import { validateOutput } from '../utils/validation-utils.js';

type ParsedDelivery = {
  +platform: 'ios' | 'macos' | 'android',
  +codeVersion: ?number,
  +stateVersion: ?number,
  +notificationID: string,
  +deviceTokens: $ReadOnlyArray<string>,
};

type RescindDelivery = {
  source: 'rescind',
  rescindedID: string,
  errors?:
    | $ReadOnlyArray<FirebaseError | mixed>
    | $ReadOnlyArray<ResponseFailure>,
};

async function rescindPushNotifs(
  notifCondition: SQLStatementType,
  inputCountCondition?: SQLStatementType,
) {
  const notificationExtractString = `$.${threadSubscriptions.home}`;
  const visPermissionExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const fetchQuery = SQL`
    SELECT n.id, n.user, n.thread, n.message, n.delivery, n.collapse_key, COUNT(
  `;
  fetchQuery.append(inputCountCondition ? inputCountCondition : SQL`m.thread`);
  fetchQuery.append(SQL`
      ) AS unread_count
    FROM notifications n
    LEFT JOIN memberships m ON m.user = n.user
      AND m.last_message_for_unread_check > m.last_read_message
      AND m.role > 0 
      AND JSON_EXTRACT(subscription, ${notificationExtractString})
      AND JSON_EXTRACT(permissions, ${visPermissionExtractString})
    WHERE n.rescinded = 0 AND
  `);
  fetchQuery.append(notifCondition);
  fetchQuery.append(SQL` GROUP BY n.id, m.user`);
  const [[fetchResult], keyserverID] = await Promise.all([
    dbQuery(fetchQuery),
    thisKeyserverID(),
  ]);

  const allDeviceTokens = new Set<string>();
  const parsedDeliveries: { [string]: $ReadOnlyArray<ParsedDelivery> } = {};

  for (const row of fetchResult) {
    const rawDelivery = JSON.parse(row.delivery);
    const deliveries = Array.isArray(rawDelivery) ? rawDelivery : [rawDelivery];
    const id = row.id.toString();

    const rowParsedDeliveries = [];

    for (const delivery of deliveries) {
      if (
        delivery.iosID ||
        delivery.deviceType === 'ios' ||
        delivery.deviceType === 'macos'
      ) {
        const deviceTokens = delivery.iosDeviceTokens ?? delivery.deviceTokens;
        rowParsedDeliveries.push({
          notificationID: delivery.iosID,
          codeVersion: delivery.codeVersion,
          stateVersion: delivery.stateVersion,
          platform: delivery.deviceType ?? 'ios',
          deviceTokens,
        });
        deviceTokens.forEach(deviceToken => allDeviceTokens.add(deviceToken));
      } else if (delivery.androidID || delivery.deviceType === 'android') {
        const deviceTokens =
          delivery.androidDeviceTokens ?? delivery.deviceTokens;
        rowParsedDeliveries.push({
          notificationID: row.collapse_key ? row.collapse_key : id,
          codeVersion: delivery.codeVersion,
          stateVersion: delivery.stateVersion,
          platform: 'android',
          deviceTokens,
        });
        deviceTokens.forEach(deviceToken => allDeviceTokens.add(deviceToken));
      }
    }
    parsedDeliveries[id] = rowParsedDeliveries;
  }
  const deviceTokenToCookieID = await getDeviceTokenToCookieID(allDeviceTokens);

  const deliveryPromises: {
    [string]: Promise<APNPushResult> | Promise<FCMPushResult>,
  } = {};
  const notifInfo = {};
  const rescindedIDs = [];

  for (const row of fetchResult) {
    const id = row.id.toString();
    const threadID = row.thread.toString();

    notifInfo[id] = {
      userID: row.user.toString(),
      threadID,
      messageID: row.message.toString(),
    };

    for (const delivery of parsedDeliveries[id]) {
      let platformDetails: PlatformDetails = { platform: delivery.platform };
      if (delivery.codeVersion) {
        platformDetails = {
          ...platformDetails,
          codeVersion: delivery.codeVersion,
        };
      }
      if (delivery.stateVersion) {
        platformDetails = {
          ...platformDetails,
          stateVersion: delivery.stateVersion,
        };
      }

      if (delivery.platform === 'ios') {
        const devices = delivery.deviceTokens.map(deviceToken => ({
          deliveryID: deviceToken,
          cryptoID: deviceTokenToCookieID[deviceToken],
        }));
        const deliveryPromise = (async () => {
          const targetedNotifications = await prepareIOSNotification(
            keyserverID,
            delivery.notificationID,
            row.unread_count,
            threadID,
            platformDetails,
            devices,
          );
          return await apnPush({
            targetedNotifications,
            platformDetails: {
              platform: 'ios',
              codeVersion: delivery.codeVersion,
            },
          });
        })();
        deliveryPromises[id] = deliveryPromise;
      } else if (delivery.platform === 'android') {
        const devices = delivery.deviceTokens.map(deviceToken => ({
          deliveryID: deviceToken,
          cryptoID: deviceTokenToCookieID[deviceToken],
        }));
        const deliveryPromise = (async () => {
          const targetedNotifications = await prepareAndroidNotification(
            keyserverID,
            delivery.notificationID,
            row.unread_count,
            threadID,
            platformDetails,
            devices,
          );
          return await fcmPush({
            targetedNotifications,
            codeVersion: delivery.codeVersion,
          });
        })();
        deliveryPromises[id] = deliveryPromise;
      }
    }
    rescindedIDs.push(id);
  }

  const numRescinds = Object.keys(deliveryPromises).length;
  const dbIDsPromise: Promise<?Array<string>> = (async () => {
    if (numRescinds === 0) {
      return undefined;
    }
    return await createIDs('notifications', numRescinds);
  })();
  const rescindPromise: Promise<mixed> = (async () => {
    if (rescindedIDs.length === 0) {
      return undefined;
    }
    const rescindQuery = SQL`
      UPDATE notifications SET rescinded = 1 WHERE id IN (${rescindedIDs})
    `;
    return await dbQuery(rescindQuery);
  })();

  const [deliveryResults, dbIDs] = await Promise.all([
    promiseAll(deliveryPromises),
    dbIDsPromise,
    rescindPromise,
  ]);

  const newNotifRows = [];
  if (numRescinds > 0) {
    invariant(dbIDs, 'dbIDs should be set');
    for (const rescindedID in deliveryResults) {
      const delivery: RescindDelivery = {
        source: 'rescind',
        rescindedID,
      };
      const { errors } = deliveryResults[rescindedID];
      if (errors) {
        delivery.errors = errors;
      }
      const dbID = dbIDs.shift();
      const { userID, threadID, messageID } = notifInfo[rescindedID];
      newNotifRows.push([
        dbID,
        userID,
        threadID,
        messageID,
        null,
        JSON.stringify([delivery]),
        1,
      ]);
    }
  }
  if (newNotifRows.length > 0) {
    const insertQuery = SQL`
      INSERT INTO notifications
        (id, user, thread, message, collapse_key, delivery, rescinded)
      VALUES ${newNotifRows}
    `;
    await dbQuery(insertQuery);
  }
}

async function getDeviceTokenToCookieID(
  deviceTokens: Set<string>,
): Promise<{ +[string]: string }> {
  if (deviceTokens.size === 0) {
    return {};
  }
  const deviceTokenToCookieID = {};
  const fetchCookiesQuery = SQL`
    SELECT id, device_token FROM cookies 
    WHERE device_token IN (${[...deviceTokens]})
  `;
  const [fetchResult] = await dbQuery(fetchCookiesQuery);
  for (const row of fetchResult) {
    deviceTokenToCookieID[row.device_token.toString()] = row.id.toString();
  }
  return deviceTokenToCookieID;
}

async function conditionallyEncryptNotification<T>(
  encryptedNotifUtilsAPIInstance: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  notification: T,
  codeVersion: ?number,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  encryptCallback: (
    encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
    senderDeviceDescriptor: SenderDeviceDescriptor,
    devices: $ReadOnlyArray<NotificationTargetDevice>,
    notification: T,
    codeVersion?: ?number,
  ) => Promise<
    $ReadOnlyArray<{
      +notification: T,
      +cryptoID: string,
      +deliveryID: string,
      +encryptionOrder?: number,
    }>,
  >,
): Promise<$ReadOnlyArray<{ +deliveryID: string, +notification: T }>> {
  const shouldBeEncrypted = codeVersion && codeVersion >= 233;
  if (!shouldBeEncrypted) {
    return devices.map(({ deliveryID }) => ({
      notification,
      deliveryID,
    }));
  }
  const notifications = await encryptCallback(
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    devices,
    notification,
    codeVersion,
  );
  return notifications.map(({ deliveryID, notification: notif }) => ({
    deliveryID,
    notification: notif,
  }));
}

async function prepareIOSNotification(
  keyserverID: string,
  iosID: string,
  unreadCount: number,
  threadID: string,
  platformDetails: PlatformDetails,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAPNsNotification>> {
  threadID = await validateOutput(platformDetails, tID, threadID);
  const { codeVersion } = platformDetails;

  const notification = new apn.Notification();
  notification.topic = getAPNsNotificationTopic({
    platform: 'ios',
    codeVersion,
  });

  if (codeVersion && codeVersion > 198) {
    notification.mutableContent = true;
    notification.pushType = 'alert';
    notification.badge = unreadCount;
  } else {
    notification.priority = 5;
    notification.contentAvailable = true;
    notification.pushType = 'background';
  }
  notification.payload = {
    backgroundNotifType: 'CLEAR',
    notificationId: iosID,
    setUnreadStatus: true,
    threadID,
    keyserverID,
  };

  return await conditionallyEncryptNotification(
    encryptedNotifUtilsAPI,
    { keyserverID },
    notification,
    codeVersion,
    devices,
    prepareEncryptedIOSNotificationRescind,
  );
}

async function prepareAndroidNotification(
  keyserverID: string,
  notifID: string,
  unreadCount: number,
  threadID: string,
  platformDetails: PlatformDetails,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAndroidNotification>> {
  threadID = await validateOutput(platformDetails, tID, threadID);
  const { targetedNotifications } = await createAndroidNotificationRescind(
    encryptedNotifUtilsAPI,
    {
      senderDeviceDescriptor: { keyserverID },
      badge: unreadCount.toString(),
      platformDetails,
      rescindID: notifID,
      threadID,
    },
    devices,
  );
  return targetedNotifications;
}

export { rescindPushNotifs };
