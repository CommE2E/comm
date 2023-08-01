// @flow

import type { ResponseFailure } from '@parse/node-apn';
import type { FirebaseApp, FirebaseError } from 'firebase-admin';
import invariant from 'invariant';
import webpush from 'web-push';

import type { PlatformDetails } from 'lib/types/device-types.js';
import type {
  WebNotification,
  WNSNotification,
} from 'lib/types/notif-types.js';
import { threadSubscriptions } from 'lib/types/subscription-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';

import {
  getAPNPushProfileForCodeVersion,
  getFCMPushProfileForCodeVersion,
  getAPNProvider,
  getFCMProvider,
  ensureWebPushInitialized,
  getWNSToken,
} from './providers.js';
import type {
  TargetedAPNsNotification,
  TargetedAndroidNotification,
} from './types.js';
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
const webInvalidTokenErrorCodes = [404, 410];
const wnsInvalidTokenErrorCodes = [404, 410];
const wnsMaxNotificationPayloadByteSize = 5000;

type APNPushResult =
  | { +success: true }
  | {
      +errors: $ReadOnlyArray<ResponseFailure>,
      +invalidTokens?: $ReadOnlyArray<string>,
    };
async function apnPush({
  targetedNotifications,
  platformDetails,
}: {
  +targetedNotifications: $ReadOnlyArray<TargetedAPNsNotification>,
  +platformDetails: PlatformDetails,
}): Promise<APNPushResult> {
  const pushProfile = getAPNPushProfileForCodeVersion(platformDetails);
  const apnProvider = await getAPNProvider(pushProfile);
  if (!apnProvider && process.env.NODE_ENV === 'development') {
    console.log(`no keyserver/secrets/${pushProfile}.json so ignoring notifs`);
    return { success: true };
  }
  invariant(apnProvider, `keyserver/secrets/${pushProfile}.json should exist`);

  const results = await Promise.all(
    targetedNotifications.map(({ notification, deviceToken }) => {
      return apnProvider.send(notification, deviceToken);
    }),
  );

  const mergedResults = { sent: [], failed: [] };
  for (const result of results) {
    mergedResults.sent.push(...result.sent);
    mergedResults.failed.push(...result.failed);
  }

  const errors = [];
  const invalidTokens = [];
  for (const error of mergedResults.failed) {
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
  targetedNotifications,
  collapseKey,
  codeVersion,
}: {
  +targetedNotifications: $ReadOnlyArray<TargetedAndroidNotification>,
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
  for (const { notification, deviceToken } of targetedNotifications) {
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
        invalidTokens.push(targetedNotifications[i].deviceToken);
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

export type WebPushError = {
  +statusCode: number,
  +headers: { +[string]: string },
  +body: string,
};
type WebPushResult = {
  +success?: true,
  +errors?: $ReadOnlyArray<WebPushError>,
  +invalidTokens?: $ReadOnlyArray<string>,
};
async function webPush({
  notification,
  deviceTokens,
}: {
  +notification: WebNotification,
  +deviceTokens: $ReadOnlyArray<string>,
}): Promise<WebPushResult> {
  await ensureWebPushInitialized();
  const notificationString = JSON.stringify(notification);

  const pushResults = await Promise.all(
    deviceTokens.map(async deviceTokenString => {
      const deviceToken: PushSubscriptionJSON = JSON.parse(deviceTokenString);
      try {
        await webpush.sendNotification(deviceToken, notificationString);
      } catch (error) {
        return { error };
      }
      return {};
    }),
  );

  const errors = [];
  const invalidTokens = [];
  for (let i = 0; i < pushResults.length; i++) {
    const pushResult = pushResults[i];
    if (pushResult.error) {
      errors.push(pushResult.error);
      if (webInvalidTokenErrorCodes.includes(pushResult.error.statusCode)) {
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

export type WNSPushError = any | string | Response;
type WNSPushResult = {
  +success?: true,
  +wnsIDs?: $ReadOnlyArray<string>,
  +errors?: $ReadOnlyArray<WNSPushError>,
  +invalidTokens?: $ReadOnlyArray<string>,
};
async function wnsPush({
  notification,
  deviceTokens,
}: {
  +notification: WNSNotification,
  +deviceTokens: $ReadOnlyArray<string>,
}): Promise<WNSPushResult> {
  const token = await getWNSToken();
  if (!token && process.env.NODE_ENV === 'development') {
    console.log(`no keyserver/secrets/wns_config.json so ignoring notifs`);
    return { success: true };
  }
  invariant(token, `keyserver/secrets/wns_config.json should exist`);

  const notificationString = JSON.stringify(notification);

  const pushResults = deviceTokens.map(async devicePushURL => {
    try {
      return await wnsSinglePush(token, notificationString, devicePushURL);
    } catch (error) {
      return { error };
    }
  });

  const errors = [];
  const notifIDs = [];
  const invalidTokens = [];
  for (let i = 0; i < pushResults.length; i++) {
    const pushResult = await pushResults[i];
    if (pushResult.error) {
      errors.push(pushResult.error);
      if (
        pushResult.error === 'invalidDomain' ||
        wnsInvalidTokenErrorCodes.includes(pushResult.error?.status)
      ) {
        invalidTokens.push(deviceTokens[i]);
      }
    } else {
      notifIDs.push(pushResult.wnsID);
    }
  }

  const result = {};
  if (notifIDs.length > 0) {
    result.wnsIDs = notifIDs;
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

async function wnsSinglePush(token: string, notification: string, url: string) {
  const parsedURL = new URL(url);
  const domain = parsedURL.hostname.split('.').slice(-3);
  if (
    domain[0] !== 'notify' ||
    domain[1] !== 'windows' ||
    domain[2] !== 'com'
  ) {
    return { error: 'invalidDomain' };
  }

  try {
    const result = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-WNS-Type': 'wns/raw',
        'Authorization': `Bearer ${token}`,
      },
      body: notification,
    });

    if (!result.ok) {
      return { error: result };
    }

    const wnsID = result.headers.get('X-WNS-MSG-ID');
    invariant(wnsID, 'Missing WNS ID');

    return { wnsID };
  } catch (err) {
    return { error: err };
  }
}

export {
  apnPush,
  fcmPush,
  webPush,
  wnsPush,
  getUnreadCounts,
  apnMaxNotificationPayloadByteSize,
  fcmMaxNotificationPayloadByteSize,
  wnsMaxNotificationPayloadByteSize,
};
