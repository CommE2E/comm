// @flow

import apn from '@parse/node-apn';
import invariant from 'invariant';

import { promiseAll } from 'lib/utils/promises';

import createIDs from '../creators/id-creator';
import { dbQuery, SQL } from '../database/database';
import type { SQLStatementType } from '../database/types';
import { fetchUnreadNotifs } from '../fetchers/notification-fetchers';
import { getAPNsNotificationTopic } from './providers';
import { apnPush, fcmPush } from './utils';

async function rescindPushNotifs(
  notifCondition: SQLStatementType,
  inputCountCondition?: SQLStatementType,
) {
  const unreadNotifs = await fetchUnreadNotifs(
    notifCondition,
    inputCountCondition,
  );

  const deliveryPromises = {};
  const notifInfo = {};
  const rescindedIDs = [];
  for (const row of unreadNotifs) {
    const rawDelivery = JSON.parse(row.delivery);
    const deliveries = Array.isArray(rawDelivery) ? rawDelivery : [rawDelivery];
    const id = row.id;
    const threadID = row.thread;
    notifInfo[id] = {
      userID: row.user,
      threadID,
      messageID: row.message,
    };
    for (const delivery of deliveries) {
      if (delivery.iosID && delivery.iosDeviceTokens) {
        // Old iOS
        const notification = prepareIOSNotification(
          delivery.iosID,
          row.unreadCount,
          threadID,
        );
        deliveryPromises[id] = apnPush({
          notification,
          deviceTokens: delivery.iosDeviceTokens,
          codeVersion: null,
        });
      } else if (delivery.androidID) {
        // Old Android
        const notification = prepareAndroidNotification(
          row.collapseKey ? row.collapseKey : id,
          row.unreadCount,
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
          row.unreadCount,
          threadID,
          codeVersion,
        );
        deliveryPromises[id] = apnPush({
          notification,
          deviceTokens,
          codeVersion,
        });
      } else if (delivery.deviceType === 'android') {
        // New Android
        const { deviceTokens, codeVersion } = delivery;
        const notification = prepareAndroidNotification(
          row.collapseKey ? row.collapseKey : id,
          row.unreadCount,
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
  notification.contentAvailable = true;
  notification.topic = getAPNsNotificationTopic(codeVersion);
  notification.priority = 5;
  notification.pushType = 'background';
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
