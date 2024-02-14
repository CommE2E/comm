// @flow

import type { ResponseFailure } from '@parse/node-apn';
import type { FirebaseApp, FirebaseError } from 'firebase-admin';
import invariant from 'invariant';
import nodeFetch from 'node-fetch';
import type { Response } from 'node-fetch';
import uuid from 'uuid';
import webpush from 'web-push';

import type { PlatformDetails } from 'lib/types/device-types.js';
import { threadSubscriptions } from 'lib/types/subscription-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';

import { encryptBlobPayload } from './crypto.js';
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
  TargetedWebNotification,
  TargetedWNSNotification,
} from './types.js';
import { dbQuery, SQL } from '../database/database.js';
import { upload } from '../services/blob.js';

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

export type APNPushResult =
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

  const errors: Array<ResponseFailure> = [];
  for (const result of results) {
    errors.push(...result.failed);
  }

  const invalidTokens: Array<string> = [];
  for (const error of errors) {
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

type WritableFCMPushResult = {
  success?: true,
  fcmIDs?: $ReadOnlyArray<string>,
  errors?: $ReadOnlyArray<FirebaseError | mixed>,
  invalidTokens?: $ReadOnlyArray<string>,
};
export type FCMPushResult = $ReadOnly<WritableFCMPushResult>;
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
  const results = await Promise.all(
    targetedNotifications.map(({ notification, deviceToken }) => {
      return fcmSinglePush(fcmProvider, notification, deviceToken, options);
    }),
  );

  const errors = [];
  const ids = [];
  const invalidTokens = [];
  for (let i = 0; i < results.length; i++) {
    const pushResult = results[i];
    for (const error of pushResult.errors) {
      errors.push(error.error);
      const errorCode =
        error.type === 'firebase_error'
          ? error.error.errorInfo.code
          : undefined;
      if (errorCode && fcmTokenInvalidationErrors.has(errorCode)) {
        invalidTokens.push(targetedNotifications[i].deviceToken);
      }
    }
    for (const id of pushResult.fcmIDs) {
      ids.push(id);
    }
  }

  const result: WritableFCMPushResult = {};
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

type FCMSinglePushError =
  | { +type: 'firebase_error', +error: FirebaseError }
  | { +type: 'exception', +error: mixed };
type FCMSinglePushResult = {
  +fcmIDs: $ReadOnlyArray<string>,
  +errors: $ReadOnlyArray<FCMSinglePushError>,
};
async function fcmSinglePush(
  provider: FirebaseApp,
  notification: Object,
  deviceToken: string,
  options: Object,
): Promise<FCMSinglePushResult> {
  try {
    const deliveryResult = await provider
      .messaging()
      .sendToDevice(deviceToken, notification, options);
    const errors = [];
    const ids = [];
    for (const fcmResult of deliveryResult.results) {
      if (fcmResult.error) {
        errors.push({ type: 'firebase_error', error: fcmResult.error });
      } else if (fcmResult.messageId) {
        ids.push(fcmResult.messageId);
      }
    }
    return { fcmIDs: ids, errors };
  } catch (e) {
    return { fcmIDs: [], errors: [{ type: 'exception', error: e }] };
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
  const usersToUnreadCounts: { [string]: number } = {};
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
type WritableWebPushResult = {
  success?: true,
  errors?: $ReadOnlyArray<WebPushError>,
  invalidTokens?: $ReadOnlyArray<string>,
};
type WebPushResult = $ReadOnly<WritableWebPushResult>;
type WebPushAttempt = {
  +error?: WebPushError,
};
async function webPush(
  targetedNotifications: $ReadOnlyArray<TargetedWebNotification>,
): Promise<WebPushResult> {
  await ensureWebPushInitialized();

  const pushResults: $ReadOnlyArray<WebPushAttempt> = await Promise.all(
    targetedNotifications.map(
      async ({ notification, deviceToken: deviceTokenString }) => {
        const deviceToken: PushSubscriptionJSON = JSON.parse(deviceTokenString);
        const notificationString = JSON.stringify(notification);
        try {
          await webpush.sendNotification(deviceToken, notificationString);
        } catch (error) {
          return ({ error }: WebPushAttempt);
        }
        return {};
      },
    ),
  );

  const errors = [];
  const invalidTokens = [];
  const deviceTokens = targetedNotifications.map(
    ({ deviceToken }) => deviceToken,
  );
  for (let i = 0; i < pushResults.length; i++) {
    const pushResult = pushResults[i];
    const { error } = pushResult;
    if (error) {
      errors.push(error);
      if (webInvalidTokenErrorCodes.includes(error.statusCode)) {
        invalidTokens.push(deviceTokens[i]);
      }
    }
  }

  const result: WritableWebPushResult = {};
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

export type WNSPushError = any | string | Response;
type WritableWNSPushResult = {
  success?: true,
  wnsIDs?: $ReadOnlyArray<string>,
  errors?: $ReadOnlyArray<WNSPushError>,
  invalidTokens?: $ReadOnlyArray<string>,
};
type WNSPushResult = $ReadOnly<WritableWNSPushResult>;
async function wnsPush(
  targetedNotifications: $ReadOnlyArray<TargetedWNSNotification>,
): Promise<WNSPushResult> {
  const token = await getWNSToken();
  if (!token && process.env.NODE_ENV === 'development') {
    console.log(`no keyserver/secrets/wns_config.json so ignoring notifs`);
    return { success: true };
  }
  invariant(token, `keyserver/secrets/wns_config.json should exist`);

  const pushResults = targetedNotifications.map(async targetedNotification => {
    const notificationString = JSON.stringify(
      targetedNotification.notification,
    );

    try {
      return await wnsSinglePush(
        token,
        notificationString,
        targetedNotification.deviceToken,
      );
    } catch (error) {
      return { error };
    }
  });

  const errors = [];
  const notifIDs = [];
  const invalidTokens = [];
  const deviceTokens = targetedNotifications.map(
    ({ deviceToken }) => deviceToken,
  );
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

  const result: WritableWNSPushResult = {};
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
  return result;
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
    const result = await nodeFetch(url, {
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

async function blobServiceUpload(payload: string): Promise<
  | {
      +blobHash: string,
      +encryptionKey: string,
    }
  | { +blobUploadError: string },
> {
  const blobHolder = uuid.v4();
  try {
    const { encryptionKey, encryptedPayload, encryptedPayloadHash } =
      await encryptBlobPayload(payload);
    await upload(encryptedPayload, {
      hash: encryptedPayloadHash,
      holder: blobHolder,
    });
    return {
      blobHash: encryptedPayloadHash,
      encryptionKey,
    };
  } catch (e) {
    return {
      blobUploadError: e.message,
    };
  }
}

export {
  apnPush,
  blobServiceUpload,
  fcmPush,
  webPush,
  wnsPush,
  getUnreadCounts,
  apnMaxNotificationPayloadByteSize,
  fcmMaxNotificationPayloadByteSize,
  wnsMaxNotificationPayloadByteSize,
};
