// @flow

import type { $Response, $Request } from 'express';

import apn from 'apn';

import apnConfig from '../../secrets/apn_config';
import { connect, SQL } from '../database';
import { getUnreadCounts } from './utils';

type PushRescindInfo = {
  userID: string,
  threadIDs: string[],
};

const apnProvider = new apn.Provider(apnConfig);

async function rescindPushNotifs(req: $Request, res: $Response) {
  res.json({ success: true });
  const pushRescindInfo: PushRescindInfo = req.body;
  const userID = pushRescindInfo.userID;

  const conn = await connect();
  const fetchQuery = SQL`
    SELECT id, delivery
    FROM notifications
    WHERE user = ${userID} AND thread IN (${pushRescindInfo.threadIDs})
      AND rescinded = 0
  `;
  const [ [ fetchResult ], unreadCounts ] = await Promise.all([
    conn.query(fetchQuery),
    getUnreadCounts(conn, [ userID ]),
  ]);

  const promises = [];
  const rescindedIDs = [];
  for (let row of fetchResult) {
    const notification = new apn.Notification();
    notification.contentAvailable = true;
    notification.badge = unreadCounts[userID];
    notification.topic = "org.squadcal.app";
    notification.payload = {
      managedAps: {
        action: "CLEAR",
        notificationId: row.delivery.iosIdentifier,
      },
    };
    promises.push(apnProvider.send(
      notification,
      row.delivery.iosDeviceTokens,
    ));
    rescindedIDs.push(row.id);
  }
  if (rescindedIDs.length > 0) {
    const rescindQuery = SQL`
      UPDATE notifications SET rescinded = 1 WHERE id IN (${rescindedIDs})
    `;
    promises.push(conn.query(rescindQuery));
  }

  const result = await Promise.all(promises);
  conn.end();
  return result;
}

export {
  rescindPushNotifs,
};
