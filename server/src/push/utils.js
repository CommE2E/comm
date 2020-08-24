// @flow

import { threadPermissions } from 'lib/types/thread-types';
import { threadSubscriptions } from 'lib/types/subscription-types';

import apn from 'apn';
import fcmAdmin from 'firebase-admin';
import invariant from 'invariant';

import { dbQuery, SQL } from '../database';

let cachedAPNProvider = undefined;
async function getAPNProvider() {
  if (cachedAPNProvider !== undefined) {
    return cachedAPNProvider;
  }
  try {
    // $FlowFixMe
    const apnConfig = await import('../../secrets/apn_config');
    if (cachedAPNProvider === undefined) {
      cachedAPNProvider = new apn.Provider(apnConfig.default);
    }
  } catch {
    if (cachedAPNProvider === undefined) {
      cachedAPNProvider = null;
    }
  }
  return cachedAPNProvider;
}

let fcmAppInitialized = undefined;
async function initializeFCMApp() {
  if (fcmAppInitialized !== undefined) {
    return fcmAppInitialized;
  }
  try {
    // $FlowFixMe
    const fcmConfig = await import('../../secrets/fcm_config');
    if (fcmAppInitialized === undefined) {
      fcmAppInitialized = true;
      fcmAdmin.initializeApp({
        credential: fcmAdmin.credential.cert(fcmConfig.default),
      });
    }
  } catch {
    if (cachedAPNProvider === undefined) {
      fcmAppInitialized = false;
    }
  }
  return fcmAppInitialized;
}

const fcmTokenInvalidationErrors = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);
const apnTokenInvalidationErrorCode = 410;
const apnBadRequestErrorCode = 400;
const apnBadTokenErrorString = 'BadDeviceToken';

async function apnPush(
  notification: apn.Notification,
  deviceTokens: $ReadOnlyArray<string>,
) {
  const apnProvider = await getAPNProvider();
  if (!apnProvider && process.env.NODE_ENV === 'dev') {
    console.log('no server/secrets/apn_config.json so ignoring notifs');
    return { success: true };
  }
  invariant(apnProvider, 'server/secrets/apn_config.json should exist');
  const result = await apnProvider.send(notification, deviceTokens);
  const errors = [];
  const invalidTokens = [];
  for (let error of result.failed) {
    errors.push(error);
    if (
      error.status == apnTokenInvalidationErrorCode ||
      (error.status == apnBadRequestErrorCode &&
        error.response.reason === apnBadTokenErrorString)
    ) {
      invalidTokens.push(error.device);
    }
  }
  if (invalidTokens.length > 0) {
    return { errors, invalidTokens };
  } else if (errors.length > 0) {
    return { errors };
  } else {
    return { success: true };
  }
}

async function fcmPush(
  notification: Object,
  deviceTokens: $ReadOnlyArray<string>,
  collapseKey: ?string,
) {
  const initialized = await initializeFCMApp();
  if (!initialized && process.env.NODE_ENV === 'dev') {
    console.log('no server/secrets/fcm_config.json so ignoring notifs');
    return { success: true };
  }
  invariant(initialized, 'server/secrets/fcm_config.json should exist');
  const options: Object = {
    priority: 'high',
  };
  if (collapseKey) {
    options.collapseKey = collapseKey;
  }
  // firebase-admin is extremely barebones and has a lot of missing or poorly
  // thought-out functionality. One of the issues is that if you send a
  // multicast messages and one of the device tokens is invalid, the resultant
  // won't explain which of the device tokens is invalid. So we're forced to
  // avoid the multicast functionality and call it once per deviceToken.
  const promises = [];
  for (let deviceToken of deviceTokens) {
    promises.push(fcmSinglePush(notification, deviceToken, options));
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

  const result = {};
  if (ids.length > 0) {
    result.fcmIDs = ids;
  }
  if (errors.length > 0) {
    result.errors = errors;
  } else {
    result.success = true;
  }
  if (invalidTokens.length > 0) {
    result.invalidTokens = invalidTokens;
  }
  return result;
}

async function fcmSinglePush(
  notification: Object,
  deviceToken: string,
  options: Object,
) {
  try {
    const deliveryResult = await fcmAdmin
      .messaging()
      .sendToDevice(deviceToken, notification, options);
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
    return { fcmIDs: [], errors: [e] };
  }
}

async function getUnreadCounts(
  userIDs: string[],
): Promise<{ [userID: string]: number }> {
  const visPermissionExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const notificationExtractString = `$.${threadSubscriptions.home}`;
  const query = SQL`
    SELECT user, COUNT(thread) AS unread_count
    FROM memberships
    WHERE user IN (${userIDs}) AND unread = 1 AND role > 0
      AND JSON_EXTRACT(permissions, ${visPermissionExtractString})
      AND JSON_EXTRACT(subscription, ${notificationExtractString})
    GROUP BY user
  `;
  const [result] = await dbQuery(query);
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

export { apnPush, fcmPush, getUnreadCounts };
