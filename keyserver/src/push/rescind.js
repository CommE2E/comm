// @flow

import apn from '@parse/node-apn';
import invariant from 'invariant';

import { NEXT_CODE_VERSION } from 'lib/shared/version-utils.js';
import { threadSubscriptions } from 'lib/types/subscription-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { promiseAll } from 'lib/utils/promises.js';

import {
  prepareEncryptedAndroidNotificationRescinds,
  prepareEncryptedIOSNotifications,
} from './crypto.js';
import { getAPNsNotificationTopic } from './providers.js';
import type {
  NotificationTargetDevice,
  TargetedAndroidNotification,
  TargetedAPNsNotification,
} from './types.js';
import { apnPush, fcmPush } from './utils.js';
import createIDs from '../creators/id-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import type { SQLStatementType } from '../database/types.js';

type ParsedDelivery = {
  +platform: 'ios' | 'android',
  +codeVersion: ?number,
  +notificationID: string,
  +deviceTokens: $ReadOnlyArray<string>,
};

type ParsedDeliveries = { +[id: string]: $ReadOnlyArray<ParsedDelivery> };

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
      AND m.last_message > m.last_read_message 
      AND m.role > 0 
      AND JSON_EXTRACT(subscription, ${notificationExtractString})
      AND JSON_EXTRACT(permissions, ${visPermissionExtractString})
    WHERE n.rescinded = 0 AND
  `);
  fetchQuery.append(notifCondition);
  fetchQuery.append(SQL` GROUP BY n.id, m.user`);
  const [fetchResult] = await dbQuery(fetchQuery);

  const allDeviceTokens = new Set();
  const parsedDeliveries: ParsedDeliveries = {};

  for (const row of fetchResult) {
    const rawDelivery = JSON.parse(row.delivery);
    const deliveries = Array.isArray(rawDelivery) ? rawDelivery : [rawDelivery];
    const id = row.id.toString();

    const rowParsedDeliveries = [];

    for (const delivery of deliveries) {
      if (delivery.iosID || delivery.deviceType === 'ios') {
        const deviceTokens = delivery.iosDeviceTokens ?? delivery.deviceTokens;
        rowParsedDeliveries.push({
          notificationID: delivery.iosID,
          codeVersion: delivery.codeVersion,
          platform: 'ios',
          deviceTokens,
        });
        deviceTokens.forEach(deviceToken => allDeviceTokens.add(deviceToken));
      } else if (delivery.androidID || delivery.deviceType === 'android') {
        const deviceTokens =
          delivery.androidDeviceTokens ?? delivery.deviceTokens;
        rowParsedDeliveries.push({
          notificationID: row.collapse_key ? row.collapse_key : id,
          codeVersion: delivery.codeVersion,
          platform: 'android',
          deviceTokens,
        });
        deviceTokens.forEach(deviceToken => allDeviceTokens.add(deviceToken));
      }
    }
    parsedDeliveries[id] = rowParsedDeliveries;
  }
  const deviceTokenToCookieID = await getDeviceTokenToCookieID(allDeviceTokens);

  const deliveryPromises = {};
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
      if (delivery.platform === 'ios') {
        const devices = delivery.deviceTokens.map(deviceToken => ({
          deviceToken,
          cookieID: deviceTokenToCookieID[deviceToken],
        }));
        const deliveryPromise = (async () => {
          const targetedNotifications = await prepareIOSNotification(
            delivery.notificationID,
            row.unread_count,
            threadID,
            delivery.codeVersion,
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
          deviceToken,
          cookieID: deviceTokenToCookieID[deviceToken],
        }));
        const deliveryPromise = (async () => {
          const targetedNotifications = await prepareAndroidNotification(
            delivery.notificationID,
            row.unread_count,
            threadID,
            delivery.codeVersion,
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
  const promises = [promiseAll(deliveryPromises)];
  if (numRescinds > 0) {
    promises.push(createIDs('notifications', numRescinds));
  }
  if (rescindedIDs.length > 0) {
    const rescindQuery = SQL`
      UPDATE notifications SET rescinded = 1 WHERE id IN (${rescindedIDs})
    `;
    promises.push(dbQuery(rescindQuery));
  }

  const [deliveryResults, dbIDs] = await Promise.all(promises);
  const newNotifRows = [];
  if (numRescinds > 0) {
    invariant(dbIDs, 'dbIDs should be set');
    for (const rescindedID in deliveryResults) {
      const delivery = {};
      delivery.source = 'rescind';
      delivery.rescindedID = rescindedID;
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
  notification: T,
  codeVersion: ?number,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  encryptCallback: (
    cookieIDs: $ReadOnlyArray<string>,
    notification: T,
  ) => Promise<$ReadOnlyArray<T>>,
): Promise<$ReadOnlyArray<{ +deviceToken: string, +notification: T }>> {
  const shouldBeEncrypted = codeVersion && codeVersion > NEXT_CODE_VERSION;
  if (!shouldBeEncrypted) {
    return devices.map(({ deviceToken }) => ({
      notification,
      deviceToken,
    }));
  }
  const notificationPromises = devices.map(({ cookieID, deviceToken }) =>
    (async () => {
      const [encryptedNotif] = await encryptCallback([cookieID], notification);
      return {
        notification: encryptedNotif,
        deviceToken,
      };
    })(),
  );
  return await Promise.all(notificationPromises);
}

async function prepareIOSNotification(
  iosID: string,
  unreadCount: number,
  threadID: string,
  codeVersion: ?number,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAPNsNotification>> {
  const notification = new apn.Notification();
  notification.topic = getAPNsNotificationTopic({
    platform: 'ios',
    codeVersion: codeVersion ?? undefined,
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
  notification.payload =
    codeVersion && codeVersion > 135
      ? {
          backgroundNotifType: 'CLEAR',
          notificationId: iosID,
          setUnreadStatus: true,
          threadID,
        }
      : {
          managedAps: {
            action: 'CLEAR',
            notificationId: iosID,
          },
        };
  return await conditionallyEncryptNotification(
    notification,
    codeVersion,
    devices,
    prepareEncryptedIOSNotifications,
  );
}

async function prepareAndroidNotification(
  notifID: string,
  unreadCount: number,
  threadID: string,
  codeVersion: ?number,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAndroidNotification>> {
  const notification = {
    data: {
      badge: unreadCount.toString(),
      rescind: 'true',
      rescindID: notifID,
      setUnreadStatus: 'true',
      threadID,
    },
  };
  return await conditionallyEncryptNotification(
    notification,
    codeVersion,
    devices,
    prepareEncryptedAndroidNotificationRescinds,
  );
}

export { rescindPushNotifs };
