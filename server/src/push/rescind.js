// @flow

import apn from 'apn';

import { dbQuery, SQL, SQLStatement } from '../database';
import { apnPush, fcmPush } from './utils';

async function rescindPushNotifs(
  notifCondition: SQLStatement,
  inputCountCondition?: SQLStatement,
) {
  const fetchQuery = SQL`
    SELECT n.id, n.delivery, n.collapse_key, COUNT(
  `;
  fetchQuery.append(inputCountCondition ? inputCountCondition : SQL`m.thread`);
  fetchQuery.append(SQL`
      ) AS unread_count
    FROM notifications n
    LEFT JOIN memberships m ON m.user = n.user AND m.unread = 1 AND m.role != 0
    WHERE n.rescinded = 0 AND
  `);
  fetchQuery.append(notifCondition);
  fetchQuery.append(SQL` GROUP BY n.id, m.user`);
  const [ fetchResult ] = await dbQuery(fetchQuery);

  const promises = [];
  const rescindedIDs = [];
  for (let row of fetchResult) {
    const deliveries = Array.isArray(row.delivery)
      ? row.delivery
      : [ row.delivery ];
    for (let delivery of row.delivery) {
      if (row.delivery.iosID && row.delivery.iosDeviceTokens) {
        // Old iOS
        const notification = prepareIOSNotification(
          row.delivery.iosID,
          row.unread_count,
        );
        promises.push(apnPush(
          notification,
          row.delivery.iosDeviceTokens,
        ));
      } else if (row.delivery.androidID) {
        // Old Android
        const notification = prepareAndroidNotification(
          row.collapse_key ? row.collapse_key : row.id.toString(),
          row.unread_count,
        );
        promises.push(fcmPush(
          notification,
          row.delivery.androidDeviceTokens,
          null,
        ));
      } else if (delivery.deviceType === "ios") {
        // New iOS
        const { iosID, deviceTokens } = delivery;
        const notification = prepareIOSNotification(
          iosID,
          row.unread_count,
        );
        promises.push(apnPush(
          notification,
          deviceTokens,
        ));
      } else if (delivery.deviceType === "android") {
        // New Android
        const { deviceTokens } = delivery;
        const notification = prepareAndroidNotification(
          row.collapse_key ? row.collapse_key : row.id.toString(),
          row.unread_count,
        );
        promises.push(fcmPush(
          notification,
          deviceTokens,
          null,
        ));
      }
    }
    rescindedIDs.push(row.id);
  }
  if (rescindedIDs.length > 0) {
    const rescindQuery = SQL`
      UPDATE notifications SET rescinded = 1 WHERE id IN (${rescindedIDs})
    `;
    promises.push(dbQuery(rescindQuery));
  }

  await Promise.all(promises);
}

function prepareIOSNotification(
  iosID: string,
  unreadCount: number,
): apn.Notification {
  const notification = new apn.Notification();
  notification.contentAvailable = true;
  notification.badge = unreadCount;
  notification.topic = "org.squadcal.app";
  notification.payload = {
    managedAps: {
      action: "CLEAR",
      notificationId: iosID,
    },
  };
  return notification;
}

function prepareAndroidNotification(
  notifID: string,
  unreadCount: number,
): Object {
  return {
    data: {
      badge: unreadCount.toString(),
      custom_notification: JSON.stringify({
        rescind: "true",
        notifID,
      }),
    },
  };
}

export {
  rescindPushNotifs,
};
