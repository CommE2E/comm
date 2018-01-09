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
  const query = SQL`
    SELECT id, delivery
    FROM notifications
    WHERE user = ${userID} AND thread IN (${pushRescindInfo.threadIDs})
  `;
  const [ [ result ], unreadCounts ] = await Promise.all([
    conn.query(query),
    getUnreadCounts(conn, [ userID ]),
  ]);
  conn.end();

  const promises = [];
  for (let row of result) {
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
  }
  return await Promise.all(promises);
}

export {
  rescindPushNotifs,
};
