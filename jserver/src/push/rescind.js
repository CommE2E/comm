// @flow

import type { Connection } from '../database';

import apn from 'apn';

import { SQL } from '../database';
import { apnPush, fcmPush, getUnreadCounts } from './utils';

async function rescindPushNotifs(
  conn: Connection,
  userID: string,
  threadIDs: $ReadOnlyArray<string>,
) {
  const fetchQuery = SQL`
    SELECT id, delivery, collapse_key
    FROM notifications
    WHERE user = ${userID} AND thread IN (${threadIDs})
      AND rescinded = 0
  `;
  const [ [ fetchResult ], unreadCounts ] = await Promise.all([
    conn.query(fetchQuery),
    getUnreadCounts(conn, [ userID ]),
  ]);

  const promises = [];
  const rescindedIDs = [];
  for (let row of fetchResult) {
    if (row.delivery.iosID) {
      const notification = new apn.Notification();
      notification.contentAvailable = true;
      notification.badge = unreadCounts[userID];
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
    promises.push(conn.query(rescindQuery));
  }

  await Promise.all(promises);
}

export {
  rescindPushNotifs,
};
