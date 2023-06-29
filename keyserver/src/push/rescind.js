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

  const allDeviceTokens = [];
  for (const row of fetchResult) {
    const rawDelivery = JSON.parse(row.delivery);
    const deliveries = Array.isArray(rawDelivery) ? rawDelivery : [rawDelivery];

    for (const delivery of deliveries) {
      if (delivery.iosID || delivery.deviceType === 'ios') {
        const deviceTokens = delivery.iosDeviceTokens ?? delivery.deviceTokens;
        allDeviceTokens.push(...deviceTokens);
      } else if (delivery.androidID || delivery.deviceType === 'android') {
        const deviceTokens =
          delivery.androidDeviceTokens ?? delivery.deviceTokens;
        allDeviceTokens.push(deviceTokens);
      }
    }
  }
  const deviceTokenToCookieID = await getDeviceTokenToCookieID(allDeviceTokens);

  const deliveryPromises = {};
  const notifInfo = {};
  const rescindedIDs = [];

  for (const row of fetchResult) {
    const rawDelivery = JSON.parse(row.delivery);
    const deliveries = Array.isArray(rawDelivery) ? rawDelivery : [rawDelivery];
    const id = row.id.toString();
    const threadID = row.thread.toString();

    notifInfo[id] = {
      userID: row.user.toString(),
      threadID,
      messageID: row.message.toString(),
    };

    for (const delivery of deliveries) {
      if (delivery.iosID) {
        const deviceTokens = delivery.iosDeviceTokens ?? delivery.deviceTokens;
        const devices = deviceTokens.map(deviceToken => ({
          deviceToken,
          cookieID: deviceTokenToCookieID[deviceToken],
        }));

        const deliveryPromise = (async () => {
          const targetedNotifications = await prepareIOSNotification(
            delivery.iosID,
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
      } else if (delivery.androidID || delivery.deviceType === 'android') {
        const deviceTokens =
          delivery.androidDeviceTokens ?? delivery.deviceTokens;
        const devices = deviceTokens.map(deviceToken => ({
          deviceToken,
          cookieID: deviceTokenToCookieID[deviceToken],
        }));
        const deliveryPromise = (async () => {
          const targetedNotifications = await prepareAndroidNotification(
            row.collapse_key ? row.collapse_key : id,
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
  deviceTokens,
): Promise<{ +[string]: string }> {
  if (deviceTokens.length === 0) {
    return {};
  }

  const deviceTokenToCookieID = {};
  const fetchCookiesQuery = SQL`
    SELECT id, device_token FROM cookies 
    WHERE device_token IN (${deviceTokens})
  `;
  const [fetchResult] = await dbQuery(fetchCookiesQuery);
  for (const row of fetchResult) {
    deviceTokenToCookieID[row.device_token.toString()] = row.id.toString();
  }
  return deviceTokenToCookieID;
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

  // It was agreed to temporarily make even releases staff-only. This way
  // we will be able to prevent shipping NSE functionality to public iOS
  // users until it is thoroughly tested among staff members.
  if (codeVersion && codeVersion > 198 && codeVersion % 2 === 0) {
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

  const deviceTokens = devices.map(({ deviceToken }) => deviceToken);
  const shouldBeEncrypted = codeVersion && codeVersion > NEXT_CODE_VERSION;

  if (!shouldBeEncrypted) {
    return deviceTokens.map(deviceToken => ({
      notification,
      deviceToken,
    }));
  }
  const cookieIDs = devices.map(({ cookieID }) => cookieID);
  const notifications = await prepareEncryptedIOSNotifications(
    cookieIDs,
    notification,
  );
  return notifications.map((notif, idx) => ({
    notification: notif,
    deviceToken: deviceTokens[idx],
  }));
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
  const deviceTokens = devices.map(({ deviceToken }) => deviceToken);
  const shouldBeEncrypted = codeVersion && codeVersion > NEXT_CODE_VERSION;
  if (!shouldBeEncrypted) {
    return deviceTokens.map(deviceToken => ({
      notification,
      deviceToken,
    }));
  }
  const cookieIDs = devices.map(({ cookieID }) => cookieID);
  const notifications = await prepareEncryptedAndroidNotificationRescinds(
    cookieIDs,
    notification,
  );
  return notifications.map((notif, idx) => ({
    notification: notif,
    deviceToken: deviceTokens[idx],
  }));
}

export { rescindPushNotifs };
