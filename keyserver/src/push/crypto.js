// @flow

import type { EncryptResult } from '@commapp/olm';
import apn from '@parse/node-apn';
import crypto from 'crypto';
import invariant from 'invariant';
import _cloneDeep from 'lodash/fp/cloneDeep.js';

import type {
  PlainTextWebNotification,
  PlainTextWebNotificationPayload,
  WebNotification,
  PlainTextWNSNotification,
  PlainTextWNSNotificationPayload,
  WNSNotification,
  AndroidVisualNotification,
  AndroidVisualNotificationPayload,
  AndroidBadgeOnlyNotification,
  AndroidNotificationRescind,
  NotificationTargetDevice,
} from 'lib/types/notif-types.js';
import { toBase64URL } from 'lib/utils/base64.js';

import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';
import { encrypt, generateKey } from '../utils/aes-crypto-utils.js';
import { getOlmUtility } from '../utils/olm-utils.js';

async function encryptAPNsNotification(
  cookieID: string,
  notification: apn.Notification,
  codeVersion?: ?number,
  notificationSizeValidator?: apn.Notification => boolean,
  blobHolder?: ?string,
): Promise<{
  +notification: apn.Notification,
  +payloadSizeExceeded: boolean,
  +encryptedPayloadHash?: string,
  +encryptionOrder?: number,
}> {
  invariant(
    !notification.collapseId,
    `Collapse ID can't be directly stored in apn.Notification object due ` +
      `to security reasons. Please put it in payload property`,
  );

  const encryptedNotification = new apn.Notification();

  encryptedNotification.id = notification.id;
  encryptedNotification.payload.id = notification.id;

  if (blobHolder) {
    encryptedNotification.payload.blobHolder = blobHolder;
  }

  encryptedNotification.payload.keyserverID = notification.payload.keyserverID;
  encryptedNotification.topic = notification.topic;
  encryptedNotification.sound = notification.aps.sound;
  encryptedNotification.pushType = 'alert';
  encryptedNotification.mutableContent = true;

  const { id, keyserverID, ...payloadSansUnencryptedData } =
    notification.payload;
  const unencryptedPayload = {
    ...payloadSansUnencryptedData,
    badge: notification.aps.badge.toString(),
    merged: notification.body,
  };

  try {
    const unencryptedSerializedPayload = JSON.stringify(unencryptedPayload);

    let dbPersistCondition;
    if (notificationSizeValidator) {
      dbPersistCondition = ({
        serializedPayload,
      }: {
        +[string]: EncryptResult,
      }) => {
        const notifCopy = _cloneDeep(encryptedNotification);
        notifCopy.payload.encryptedPayload = serializedPayload.body;
        return notificationSizeValidator(notifCopy);
      };
    }
    const {
      encryptedMessages: { serializedPayload },
      dbPersistConditionViolated,
      encryptionOrder,
    } = await encryptAndUpdateOlmSession(
      cookieID,
      'notifications',
      {
        serializedPayload: unencryptedSerializedPayload,
      },
      dbPersistCondition,
    );

    encryptedNotification.payload.encryptedPayload = serializedPayload.body;

    if (codeVersion && codeVersion >= 254 && codeVersion % 2 === 0) {
      encryptedNotification.aps = {
        alert: { body: 'ENCRYPTED' },
        ...encryptedNotification.aps,
      };
    }

    const encryptedPayloadHash = getOlmUtility().sha256(serializedPayload.body);
    return {
      notification: encryptedNotification,
      payloadSizeExceeded: !!dbPersistConditionViolated,
      encryptedPayloadHash,
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed: ' + e);

    encryptedNotification.body = notification.body;
    encryptedNotification.threadId = notification.payload.threadID;
    invariant(
      typeof notification.aps.badge === 'number',
      'Unencrypted notification must have badge as a number',
    );
    encryptedNotification.badge = notification.aps.badge;

    encryptedNotification.payload = {
      ...encryptedNotification.payload,
      ...notification.payload,
      encryptionFailed: 1,
    };
    return {
      notification: encryptedNotification,
      payloadSizeExceeded: notificationSizeValidator
        ? notificationSizeValidator(_cloneDeep(encryptedNotification))
        : false,
    };
  }
}

async function encryptAndroidNotificationPayload<T>(
  cookieID: string,
  unencryptedPayload: T,
  payloadSizeValidator?: (T | { +encryptedPayload: string }) => boolean,
): Promise<{
  +resultPayload: T | { +encryptedPayload: string },
  +payloadSizeExceeded: boolean,
  +encryptionOrder?: number,
}> {
  try {
    const unencryptedSerializedPayload = JSON.stringify(unencryptedPayload);
    if (!unencryptedSerializedPayload) {
      return {
        resultPayload: unencryptedPayload,
        payloadSizeExceeded: payloadSizeValidator
          ? payloadSizeValidator(unencryptedPayload)
          : false,
      };
    }

    let dbPersistCondition;
    if (payloadSizeValidator) {
      dbPersistCondition = ({
        serializedPayload,
      }: {
        +[string]: EncryptResult,
      }) => payloadSizeValidator({ encryptedPayload: serializedPayload.body });
    }

    const {
      encryptedMessages: { serializedPayload },
      dbPersistConditionViolated,
      encryptionOrder,
    } = await encryptAndUpdateOlmSession(
      cookieID,
      'notifications',
      {
        serializedPayload: unencryptedSerializedPayload,
      },
      dbPersistCondition,
    );
    return {
      resultPayload: { encryptedPayload: serializedPayload.body },
      payloadSizeExceeded: !!dbPersistConditionViolated,
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed: ' + e);
    const resultPayload = {
      encryptionFailed: '1',
      ...unencryptedPayload,
    };
    return {
      resultPayload,
      payloadSizeExceeded: payloadSizeValidator
        ? payloadSizeValidator(resultPayload)
        : false,
    };
  }
}

async function encryptAndroidVisualNotification(
  cookieID: string,
  notification: AndroidVisualNotification,
  notificationSizeValidator?: AndroidVisualNotification => boolean,
  blobHolder?: ?string,
): Promise<{
  +notification: AndroidVisualNotification,
  +payloadSizeExceeded: boolean,
  +encryptionOrder?: number,
}> {
  const { id, keyserverID, ...rest } = notification.data;

  let unencryptedData = { keyserverID };
  if (id) {
    unencryptedData = { ...unencryptedData, id };
  }

  let unencryptedPayload = rest;
  if (blobHolder) {
    unencryptedPayload = { ...unencryptedPayload, blobHolder };
  }

  let payloadSizeValidator;
  if (notificationSizeValidator) {
    payloadSizeValidator = (
      payload: AndroidVisualNotificationPayload | { +encryptedPayload: string },
    ) => {
      return notificationSizeValidator({
        data: { ...unencryptedData, ...payload },
      });
    };
  }
  const { resultPayload, payloadSizeExceeded, encryptionOrder } =
    await encryptAndroidNotificationPayload(
      cookieID,
      unencryptedPayload,
      payloadSizeValidator,
    );
  return {
    notification: {
      data: {
        ...unencryptedData,
        ...resultPayload,
      },
    },
    payloadSizeExceeded,
    encryptionOrder,
  };
}

async function encryptAndroidSilentNotification(
  cookieID: string,
  notification: AndroidNotificationRescind | AndroidBadgeOnlyNotification,
): Promise<AndroidNotificationRescind | AndroidBadgeOnlyNotification> {
  // We don't validate payload size for rescind
  // since they are expected to be small and
  // never exceed any FCM limit
  const { keyserverID, ...unencryptedPayload } = notification.data;
  const { resultPayload } = await encryptAndroidNotificationPayload(
    cookieID,
    unencryptedPayload,
  );
  if (resultPayload.encryptedPayload) {
    return {
      data: { keyserverID, ...resultPayload },
    };
  }

  if (resultPayload.rescind) {
    return {
      data: { keyserverID, ...resultPayload },
    };
  }

  return {
    data: {
      keyserverID,
      ...resultPayload,
    },
  };
}

async function encryptBasicPayload<T>(
  cookieID: string,
  basicPayload: T,
): Promise<
  | { +encryptedPayload: string, +encryptionOrder?: number }
  | { ...T, +encryptionFailed: '1' },
> {
  const unencryptedSerializedPayload = JSON.stringify(basicPayload);

  if (!unencryptedSerializedPayload) {
    return { ...basicPayload, encryptionFailed: '1' };
  }

  try {
    const {
      encryptedMessages: { serializedPayload },
      encryptionOrder,
    } = await encryptAndUpdateOlmSession(cookieID, 'notifications', {
      serializedPayload: unencryptedSerializedPayload,
    });

    return {
      encryptedPayload: serializedPayload.body,
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed: ' + e);
    return {
      ...basicPayload,
      encryptionFailed: '1',
    };
  }
}

async function encryptWebNotification(
  cookieID: string,
  notification: PlainTextWebNotification,
): Promise<{ +notification: WebNotification, +encryptionOrder?: number }> {
  const { id, keyserverID, ...payloadSansId } = notification;
  const { encryptionOrder, ...encryptionResult } =
    await encryptBasicPayload<PlainTextWebNotificationPayload>(
      cookieID,
      payloadSansId,
    );
  return {
    notification: { id, keyserverID, ...encryptionResult },
    encryptionOrder,
  };
}

async function encryptWNSNotification(
  cookieID: string,
  notification: PlainTextWNSNotification,
): Promise<{ +notification: WNSNotification, +encryptionOrder?: number }> {
  const { keyserverID, ...payloadSansKeyserverID } = notification;
  const { encryptionOrder, ...encryptionResult } =
    await encryptBasicPayload<PlainTextWNSNotificationPayload>(
      cookieID,
      payloadSansKeyserverID,
    );
  return {
    notification: { keyserverID, ...encryptionResult },
    encryptionOrder,
  };
}

function prepareEncryptedAPNsNotifications(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: apn.Notification,
  codeVersion?: ?number,
  notificationSizeValidator?: apn.Notification => boolean,
): Promise<
  $ReadOnlyArray<{
    +cookieID: string,
    +deviceToken: string,
    +notification: apn.Notification,
    +payloadSizeExceeded: boolean,
    +encryptedPayloadHash?: string,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ cookieID, deviceToken, blobHolder }) => {
      const notif = await encryptAPNsNotification(
        cookieID,
        notification,
        codeVersion,
        notificationSizeValidator,
        blobHolder,
      );
      return { cookieID, deviceToken, ...notif };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedIOSNotificationRescind(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: apn.Notification,
  codeVersion?: ?number,
): Promise<
  $ReadOnlyArray<{
    +cookieID: string,
    +deviceToken: string,
    +notification: apn.Notification,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ deviceToken, cookieID }) => {
      const { notification: notif } = await encryptAPNsNotification(
        cookieID,
        notification,
        codeVersion,
      );
      return { deviceToken, cookieID, notification: notif };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedAndroidVisualNotifications(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: AndroidVisualNotification,
  notificationSizeValidator?: (
    notification: AndroidVisualNotification,
  ) => boolean,
): Promise<
  $ReadOnlyArray<{
    +cookieID: string,
    +deviceToken: string,
    +notification: AndroidVisualNotification,
    +payloadSizeExceeded: boolean,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ deviceToken, cookieID, blobHolder }) => {
      const notif = await encryptAndroidVisualNotification(
        cookieID,
        notification,
        notificationSizeValidator,
        blobHolder,
      );
      return { deviceToken, cookieID, ...notif };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedAndroidSilentNotifications(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: AndroidNotificationRescind | AndroidBadgeOnlyNotification,
): Promise<
  $ReadOnlyArray<{
    +cookieID: string,
    +deviceToken: string,
    +notification: AndroidNotificationRescind | AndroidBadgeOnlyNotification,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ deviceToken, cookieID }) => {
      const notif = await encryptAndroidSilentNotification(
        cookieID,
        notification,
      );
      return { deviceToken, cookieID, notification: notif };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedWebNotifications(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: PlainTextWebNotification,
): Promise<
  $ReadOnlyArray<{
    +deviceToken: string,
    +notification: WebNotification,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ deviceToken, cookieID }) => {
      const notif = await encryptWebNotification(cookieID, notification);
      return { ...notif, deviceToken };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedWNSNotifications(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: PlainTextWNSNotification,
): Promise<
  $ReadOnlyArray<{
    +deviceToken: string,
    +notification: WNSNotification,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ deviceToken, cookieID }) => {
      const notif = await encryptWNSNotification(cookieID, notification);
      return { ...notif, deviceToken };
    },
  );
  return Promise.all(notificationPromises);
}

async function encryptBlobPayload(payload: string): Promise<{
  +encryptionKey: string,
  +encryptedPayload: Blob,
  +encryptedPayloadHash: string,
}> {
  const encryptionKey = await generateKey();
  const encryptedPayload = await encrypt(
    encryptionKey,
    new TextEncoder().encode(payload),
  );
  const encryptedPayloadBuffer = Buffer.from(encryptedPayload);
  const blobHashBase64 = await crypto
    .createHash('sha256')
    .update(encryptedPayloadBuffer)
    .digest('base64');
  const blobHash = toBase64URL(blobHashBase64);

  const payloadBlob = new Blob([encryptedPayloadBuffer]);
  const encryptionKeyString = Buffer.from(encryptionKey).toString('base64');
  return {
    encryptionKey: encryptionKeyString,
    encryptedPayload: payloadBlob,
    encryptedPayloadHash: blobHash,
  };
}

export {
  prepareEncryptedAPNsNotifications,
  prepareEncryptedIOSNotificationRescind,
  prepareEncryptedAndroidVisualNotifications,
  prepareEncryptedAndroidSilentNotifications,
  prepareEncryptedWebNotifications,
  prepareEncryptedWNSNotifications,
  encryptBlobPayload,
};
