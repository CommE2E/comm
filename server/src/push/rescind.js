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
  `;
  fetchQuery.append(notifCondition);
  fetchQuery.append(SQL` GROUP BY n.id, m.user`);
  const [ fetchResult ] = await dbQuery(fetchQuery);

  const promises = [];
  const rescindedIDs = [];
  for (let row of fetchResult) {
    if (row.delivery.iosID) {
      const notification = new apn.Notification();
      notification.contentAvailable = true;
      notification.badge = row.unread_count;
      notification.topic = "org.squadcal.app";
      notification.payload = {
        managedAps: {
          action: "CLEAR",
          notificationId: row.delivery.iosID,
        },
      };
      promises.push(apnPush(
        notification,
        row.delivery.iosDeviceTokens,
        row.id,
      ));
    }
    if (row.delivery.androidID) {
      const notification = {
        data: {
          rescind: "true",
          notifID: row.collapse_key ? row.collapse_key : row.id.toString(),
        },
      };
      promises.push(fcmPush(
        notification,
        row.delivery.androidDeviceTokens,
        null,
        row.id,
      ));
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

export {
  rescindPushNotifs,
};
