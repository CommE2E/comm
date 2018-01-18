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

const fcmTokenInvalidationErrors = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

async function apnPush(
  notification: apn.Notification,
  deviceTokens: string[],
  dbID: string,
) {
  const result = await apnProvider.send(notification, deviceTokens);
  const errors = [];
  for (let failure of result.failed) {
    errors.push(failure);
  }
  if (errors.length > 0) {
    return { errors, dbID };
  }
  return { success: true, dbID };
}

async function fcmPush(
  notification: Object,
  deviceTokens: string[],
  dbID: string,
) {
  // firebase-admin is extremely barebones and has a lot of missing or poorly
  // thought-out functionality. One of the issues is that if you send a
  // multicast messages and one of the device tokens is invalid, the resultant
  // won't explain which of the device tokens is invalid. So we're forced to
  // avoid the multicast functionality and call it once per deviceToken.
  const promises = [];
  for (let deviceToken of deviceTokens) {
    promises.push(fcmSinglePush(
      notification,
      deviceToken,
    ));
  }
  const pushResults = await Promise.all(promises);

  const errors = [];
  const ids = [];
  const invalidTokens = [];
  for (let i = 0; i < pushResults.length; i++) {
    const pushResult = pushResults[i];
    for (let error of pushResult.errors) {
      errors.push(error);
      if (fcmTokenInvalidationErrors.has(error.errorInfo.code)) {
        invalidTokens.push(deviceTokens[i]);
      }
    }
    for (let id of pushResult.fcmIDs) {
      ids.push(id);
    }
  }

  const result: Object = { dbID };
  if (ids.length > 0) {
    result.fcmIDs = ids;
  }
  if (errors.length > 0) {
    result.errors = errors;
  } else {
    result.success = true;
  }
  if (invalidTokens.length > 0) {
    result.invalidFCMTokens = invalidTokens;
  }
  return result;
}

async function fcmSinglePush(
  notification: Object,
  deviceToken: string,
) {
  try {
    const deliveryResult = await fcmAdmin.messaging().sendToDevice(
      deviceToken,
      notification,
    );
    const errors = [];
    const ids = [];
    for (let fcmResult of deliveryResult.results) {
      if (fcmResult.error) {
        errors.push(fcmResult.error);
      } else if (fcmResult.messageId) {
        ids.push(fcmResult.messageId);
      }
    }
    return { fcmIDs: ids, errors };
  } catch (e) {
    return { fcmIDs: [], errors: [ e ] };
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
