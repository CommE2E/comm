// @flow

import apn from '@parse/node-apn';
import invariant from 'invariant';

import { threadSubscriptions } from 'lib/types/subscription-types.js';
import { threadPermissions } from 'lib/types/thread-types.js';
import { promiseAll } from 'lib/utils/promises.js';

import { getAPNsNotificationTopic } from './providers.js';
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
      if (delivery.iosID && delivery.iosDeviceTokens) {
        // Old iOS
        const notification = prepareIOSNotification(
          delivery.iosID,
          row.unread_count,
          threadID,
        );
        deliveryPromises[id] = apnPush({
          notification,
          deviceTokens: delivery.iosDeviceTokens,
          platformDetails: { platform: 'ios' },
        });
      } else if (delivery.androidID) {
        // Old Android
        const notification = prepareAndroidNotification(
          row.collapse_key ? row.collapse_key : id,
          row.unread_count,
          threadID,
        );
        deliveryPromises[id] = fcmPush({
          notification,
          deviceTokens: delivery.androidDeviceTokens,
          codeVersion: null,
        });
      } else if (delivery.deviceType === 'ios') {
        // New iOS
        const { iosID, deviceTokens, codeVersion } = delivery;
        const notification = prepareIOSNotification(
          iosID,
          row.unread_count,
          threadID,
          codeVersion,
        );
        deliveryPromises[id] = apnPush({
          notification,
          deviceTokens,
          platformDetails: { platform: 'ios', codeVersion },
        });
      } else if (delivery.deviceType === 'android') {
        // New Android
        const { deviceTokens, codeVersion } = delivery;
        const notification = prepareAndroidNotification(
          row.collapse_key ? row.collapse_key : id,
          row.unread_count,
          threadID,
        );
        deliveryPromises[id] = fcmPush({
          notification,
          deviceTokens,
          codeVersion,
        });
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
}

function prepareIOSNotification(
  iosID: string,
  unreadCount: number,
  threadID: string,
  codeVersion: ?number,
): apn.Notification {
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
  return notification;
}

function prepareAndroidNotification(
  notifID: string,
  unreadCount: number,
  threadID: string,
): Object {
  return {
    data: {
      badge: unreadCount.toString(),
      rescind: 'true',
      rescindID: notifID,
      setUnreadStatus: 'true',
      threadID,
    },
  };
}

export { rescindPushNotifs };
