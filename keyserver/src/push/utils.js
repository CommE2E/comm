// @flow

import apn from '@parse/node-apn';
import type { ResponseFailure } from '@parse/node-apn';
import type { FirebaseApp, FirebaseError } from 'firebase-admin';
import invariant from 'invariant';
import webpush from 'web-push';

import { threadSubscriptions } from 'lib/types/subscription-types.js';
import { threadPermissions } from 'lib/types/thread-types.js';

import {
  getAPNPushProfileForCodeVersion,
  getFCMPushProfileForCodeVersion,
  getAPNProvider,
  getFCMProvider,
  ensureWebPushInitialized,
} from './providers.js';
import { dbQuery, SQL } from '../database/database.js';

const fcmTokenInvalidationErrors = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);
const fcmMaxNotificationPayloadByteSize = 4000;
const apnTokenInvalidationErrorCode = 410;
const apnBadRequestErrorCode = 400;
const apnBadTokenErrorString = 'BadDeviceToken';
const apnMaxNotificationPayloadByteSize = 4096;

type APNPushResult =
  | { +success: true }
  | {
      +errors: $ReadOnlyArray<ResponseFailure>,
      +invalidTokens?: $ReadOnlyArray<string>,
    };
async function apnPush({
  notification,
  deviceTokens,
  codeVersion,
}: {
  +notification: apn.Notification,
  +deviceTokens: $ReadOnlyArray<string>,
  +codeVersion: ?number,
}): Promise<APNPushResult> {
  const pushProfile = getAPNPushProfileForCodeVersion(codeVersion);
  const apnProvider = await getAPNProvider(pushProfile);
  if (!apnProvider && process.env.NODE_ENV === 'development') {
    console.log(`no keyserver/secrets/${pushProfile}.json so ignoring notifs`);
    return { success: true };
  }
  invariant(apnProvider, `keyserver/secrets/${pushProfile}.json should exist`);
  const result = await apnProvider.send(notification, deviceTokens);
  const errors = [];
  const invalidTokens = [];
  for (const error of result.failed) {
    errors.push(error);
    /* eslint-disable eqeqeq */
    if (
      error.status == apnTokenInvalidationErrorCode ||
      (error.status == apnBadRequestErrorCode &&
        error.response.reason === apnBadTokenErrorString)
    ) {
      invalidTokens.push(error.device);
    }
    /* eslint-enable eqeqeq */
  }
  if (invalidTokens.length > 0) {
    return { errors, invalidTokens };
  } else if (errors.length > 0) {
    return { errors };
  } else {
    return { success: true };
  }
}

type FCMPushResult = {
  +success?: true,
  +fcmIDs?: $ReadOnlyArray<string>,
  +errors?: $ReadOnlyArray<FirebaseError>,
  +invalidTokens?: $ReadOnlyArray<string>,
};
async function fcmPush({
  notification,
  deviceTokens,
  collapseKey,
  codeVersion,
}: {
  +notification: Object,
  +deviceTokens: $ReadOnlyArray<string>,
  +codeVersion: ?number,
  +collapseKey?: ?string,
}): Promise<FCMPushResult> {
  const pushProfile = getFCMPushProfileForCodeVersion(codeVersion);
  const fcmProvider = await getFCMProvider(pushProfile);
  if (!fcmProvider && process.env.NODE_ENV === 'development') {
    console.log(`no keyserver/secrets/${pushProfile}.json so ignoring notifs`);
    return { success: true };
  }
  invariant(fcmProvider, `keyserver/secrets/${pushProfile}.json should exist`);
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
    promises.push(
      fcmSinglePush(fcmProvider, notification, deviceToken, options),
    );
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
  return { ...result };
}

async function fcmSinglePush(
  provider: FirebaseApp,
  notification: Object,
  deviceToken: string,
  options: Object,
) {
  try {
    const deliveryResult = await provider
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

type WebPushResult = {
  +success?: true,
  +errors?: $ReadOnlyArray<Object>,
  +invalidTokens?: $ReadOnlyArray<string>,
};
async function webPush({
  notification,
  deviceTokens,
}: {
  +notification: Object,
  +deviceTokens: $ReadOnlyArray<string>,
}): Promise<WebPushResult> {
  await ensureWebPushInitialized();
  const notificationString = JSON.stringify(notification);

  const promises = [];
  for (const deviceTokenString of deviceTokens) {
    const deviceToken: PushSubscriptionJSON = JSON.parse(deviceTokenString);
    promises.push(
      (async () => {
        try {
          await webpush.sendNotification(deviceToken, notificationString);
        } catch (error) {
          return { error };
        }
        return {};
      })(),
    );
  }

  const pushResults = await Promise.all(promises);

  const errors = [];
  const invalidTokens = [];
  for (let i = 0; i < pushResults.length; i++) {
    const pushResult = pushResults[i];
    if (pushResult.error) {
      errors.push(pushResult.error);
      if (
        pushResult.error.statusCode === 404 ||
        pushResult.error.statusCode === 410
      ) {
        invalidTokens.push(deviceTokens[i]);
      }
    }
  }

  const result = {};
  if (errors.length > 0) {
    result.errors = errors;
  } else {
    result.success = true;
  }
  if (invalidTokens.length > 0) {
    result.invalidTokens = invalidTokens;
  }
  return { ...result };
}

export {
  apnPush,
  fcmPush,
  webPush,
  getUnreadCounts,
  apnMaxNotificationPayloadByteSize,
  fcmMaxNotificationPayloadByteSize,
};
