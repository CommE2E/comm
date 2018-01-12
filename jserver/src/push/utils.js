// @flow

import type { Connection } from '../database';

import apn from 'apn';
import fcmAdmin from 'firebase-admin';

import { SQL } from '../database';
import apnConfig from '../../secrets/apn_config';
import fcmConfig from '../../secrets/fcm_config';

const apnProvider = new apn.Provider(apnConfig);
fcmAdmin.initializeApp({
  credential: fcmAdmin.credential.cert(fcmConfig),
});

async function apnPush(
  notification: apn.Notification,
  deviceTokens: string[],
  dbID: string,
) {
  const result = await apnProvider.send(notification, deviceTokens);
  for (let failure of result.failed) {
    return { error: failure, dbID };
  }
  return { success: true, dbID };
}

async function fcmPush(
  notification: Object,
  deviceTokens: string[],
  dbID: string,
) {
  try {
    const result = await fcmAdmin.messaging().sendToDevice(
      deviceTokens,
      notification,
    );
    console.log(result);
    return { success: true, dbID, result };
  } catch (e) {
    console.log(e);
    return { error: e, dbID };
  }
}

async function getUnreadCounts(
  conn: Connection,
  userIDs: string[],
): Promise<{ [userID: string]: number }> {
  const query = SQL`
    SELECT user, COUNT(thread) AS unread_count
    FROM memberships
    WHERE user IN (${userIDs}) AND unread = 1 AND role != 0
    GROUP BY user
  `;
  const [ result ] = await conn.query(query);
  const usersToUnreadCounts = {};
  for (let row of result) {
    usersToUnreadCounts[row.user.toString()] = row.unread_count;
  }
  for (let userID of userIDs) {
    if (usersToUnreadCounts[userID] === undefined) {
      usersToUnreadCounts[userID] = 0;
    }
  }
  return usersToUnreadCounts;
}

export {
  apnPush,
  fcmPush,
  getUnreadCounts,
}
