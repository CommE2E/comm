// @flow

import apn from '@parse/node-apn';
import fcmAdmin from 'firebase-admin';
import invariant from 'invariant';

import { threadSubscriptions } from 'lib/types/subscription-types';
import { threadPermissions } from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';

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

function endFirebase() {
  fcmAdmin.apps?.forEach((app) => app?.delete());
}

async function endAPNs() {
  const apnProvider = await getAPNProvider();
  apnProvider?.shutdown();
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
  if (!apnProvider && process.env.NODE_ENV === 'development') {
    console.log('no server/secrets/apn_config.json so ignoring notifs');
    return { success: true };
  }
  invariant(apnProvider, 'server/secrets/apn_config.json should exist');
  const result = await apnProvider.send(notification, deviceTokens);
  const errors = [];
  const invalidTokens = [];
  for (const error of result.failed) {
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
  if (!initialized && process.env.NODE_ENV === 'development') {
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
  for (const deviceToken of deviceTokens) {
    promises.push(fcmSinglePush(notification, deviceToken, options));
  }
  const pushResults = await Promise.all(promises);

  const errors = [];
  const ids = [];
  const invalidTokens = [];
  for (let i = 0; i < pushResults.length; i++) {
    const pushResult = pushResults[i];
    for (const error of pushResult.errors) {
      errors.push(error);
      if (fcmTokenInvalidationErrors.has(error.errorInfo.code)) {
        invalidTokens.push(deviceTokens[i]);
      }
    }
    for (const id of pushResult.fcmIDs) {
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
    for (const fcmResult of deliveryResult.results) {
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
    WHERE user IN (${userIDs}) AND last_message > last_read_message 
      AND role > 0
      AND JSON_EXTRACT(permissions, ${visPermissionExtractString})
      AND JSON_EXTRACT(subscription, ${notificationExtractString})
    GROUP BY user
  `;
  const [result] = await dbQuery(query);
  const usersToUnreadCounts = {};
  for (const row of result) {
    usersToUnreadCounts[row.user.toString()] = row.unread_count;
  }
  for (const userID of userIDs) {
    if (usersToUnreadCounts[userID] === undefined) {
      usersToUnreadCounts[userID] = 0;
    }
  }
  return usersToUnreadCounts;
}

export { apnPush, fcmPush, getUnreadCounts, endFirebase, endAPNs };
