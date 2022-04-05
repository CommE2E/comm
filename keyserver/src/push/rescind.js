// @flow

import apn from '@parse/node-apn';
import invariant from 'invariant';

import { threadSubscriptions } from 'lib/types/subscription-types';
import { threadPermissions } from 'lib/types/thread-types';
import { promiseAll } from 'lib/utils/promises';

import createIDs from '../creators/id-creator';
import { dbQuery, SQL } from '../database/database';
import type { SQLStatementType } from '../database/types';
import { getAPNsNotificationTopic } from './providers';
import { apnPush, fcmPush } from './utils';

// Returns list of deviceTokens that have been updated
async function rescindPushNotifs(
  notifCondition: SQLStatementType,
  inputCountCondition?: SQLStatementType,
): Promise<string[]> {
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

  const deliveryPromises = {};
  const notifInfo = {};
  const rescindedIDs = [];
  const receivingDeviceTokens = [];
  for (const row of fetchResult) {
    const deliveries = Array.isArray(row.delivery)
      ? row.delivery
      : [row.delivery];
    const id = row.id.toString();
    const threadID = row.thread.toString();
    notifInfo[id] = {
      userID: row.user.toString(),
      threadID,
      messageID: row.message.toString(),
    };
    for (const delivery of deliveries) {
      if (delivery.iosID && delivery.iosDeviceTokens) {
        // Old iOS
        const notification = prepareIOSNotification(
          delivery.iosID,
          row.unread_count,
        );
        deliveryPromises[id] = apnPush({
          notification,
          deviceTokens: delivery.iosDeviceTokens,
          codeVersion: null,
        });
        receivingDeviceTokens.push(...delivery.iosDeviceTokens);
      } else if (delivery.androidID) {
        // Old Android
        const notification = prepareAndroidNotification(
          row.collapse_key ? row.collapse_key : id,
          row.unread_count,
          threadID,
          null,
        );
        deliveryPromises[id] = fcmPush({
          notification,
          deviceTokens: delivery.androidDeviceTokens,
          codeVersion: null,
        });
        receivingDeviceTokens.push(...delivery.androidDeviceTokens);
      } else if (delivery.deviceType === 'ios') {
        // New iOS
        const { iosID, deviceTokens, codeVersion } = delivery;
        const notification = prepareIOSNotification(
          iosID,
          row.unread_count,
          codeVersion,
        );
        deliveryPromises[id] = apnPush({
          notification,
          deviceTokens,
          codeVersion,
        });
        receivingDeviceTokens.push(...deviceTokens);
      } else if (delivery.deviceType === 'android') {
        // New Android
        const { deviceTokens, codeVersion } = delivery;
        const notification = prepareAndroidNotification(
          row.collapse_key ? row.collapse_key : id,
          row.unread_count,
          threadID,
          codeVersion,
        );
        deliveryPromises[id] = fcmPush({
          notification,
          deviceTokens,
          codeVersion,
        });
        receivingDeviceTokens.push(...deviceTokens);
      }
    }
    rescindedIDs.push(row.id);
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

  return [...new Set(receivingDeviceTokens)];
}

function prepareIOSNotification(
  iosID: string,
  unreadCount: number,
  codeVersion: ?number,
): apn.Notification {
  const notification = new apn.Notification();
  notification.contentAvailable = true;
  notification.badge = unreadCount;
  notification.topic = getAPNsNotificationTopic(codeVersion);
  notification.payload =
    codeVersion && codeVersion > 1000
      ? {
          backgroundNotifType: 'CLEAR',
          notificationId: iosID,
        }
      : {
          managedAps: {
            action: 'CLEAR',
            notificationId: iosID,
          },
        };
  return notification;
}

function prepareAndroidNotification(
  notifID: string,
  unreadCount: number,
  threadID: string,
  codeVersion: ?number,
): Object {
  if (!codeVersion || codeVersion < 31) {
    return {
      data: {
        badge: unreadCount.toString(),
        custom_notification: JSON.stringify({
          rescind: 'true',
          notifID,
        }),
      },
    };
  }
  return {
    data: {
      badge: unreadCount.toString(),
      rescind: 'true',
      rescindID: notifID,
      threadID,
    },
  };
}

export { rescindPushNotifs };
