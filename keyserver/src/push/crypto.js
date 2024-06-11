// @flow

import apn from '@parse/node-apn';
import crypto from 'crypto';
import invariant from 'invariant';
import _cloneDeep from 'lodash/fp/cloneDeep.js';

import type {
  PlainTextWebNotification,
  PlainTextWebNotificationPayload,
  WebNotification,
  PlainTextWNSNotification,
  WNSNotification,
  AndroidVisualNotification,
  AndroidVisualNotificationPayload,
  AndroidBadgeOnlyNotification,
  AndroidNotificationRescind,
  NotificationTargetDevice,
  SenderDeviceDescriptor,
  EncryptedNotifUtilsAPI,
} from 'lib/types/notif-types.js';
import { toBase64URL } from 'lib/utils/base64.js';

import { encrypt, generateKey } from '../utils/aes-crypto-utils.js';
import { getOlmUtility } from '../utils/olm-utils.js';

async function encryptAPNsNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
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

  const { id, ...payloadSansUnencryptedData } = notification.payload;
  const unencryptedPayload = {
    ...payloadSansUnencryptedData,
    badge: notification.aps.badge.toString(),
    merged: notification.body,
  };

  try {
    const unencryptedSerializedPayload = JSON.stringify(unencryptedPayload);

    let dbPersistCondition;
    if (notificationSizeValidator) {
      dbPersistCondition = (serializedPayload: string) => {
        const notifCopy = _cloneDeep(encryptedNotification);
        notifCopy.payload.encryptedPayload = serializedPayload;
        return notificationSizeValidator(notifCopy);
      };
    }
    const {
      encryptedData: serializedPayload,
      sizeLimitViolated: dbPersistConditionViolated,
      encryptionOrder,
    } = await encryptedNotifUtilsAPI.encryptSerializedNotifPayload(
      cookieID,
      unencryptedSerializedPayload,
      dbPersistCondition,
    );

    encryptedNotification.payload.encryptedPayload = serializedPayload.body;
    encryptedNotification.payload = {
      ...encryptedNotification.payload,
      ...senderDeviceDescriptor,
    };

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
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  unencryptedPayload: T,
  payloadSizeValidator?: (
    T | $ReadOnly<{ ...SenderDeviceDescriptor, +encryptedPayload: string }>,
  ) => boolean,
): Promise<{
  +resultPayload:
    | T
    | $ReadOnly<{ ...SenderDeviceDescriptor, +encryptedPayload: string }>,
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
      dbPersistCondition = (serializedPayload: string) =>
        payloadSizeValidator({
          encryptedPayload: serializedPayload,
          ...senderDeviceDescriptor,
        });
    }

    const {
      encryptedData: serializedPayload,
      sizeLimitViolated: dbPersistConditionViolated,
      encryptionOrder,
    } = await encryptedNotifUtilsAPI.encryptSerializedNotifPayload(
      cookieID,
      unencryptedSerializedPayload,
      dbPersistCondition,
    );

    return {
      resultPayload: {
        encryptedPayload: serializedPayload.body,
        ...senderDeviceDescriptor,
      },
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
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  cookieID: string,
  notification: AndroidVisualNotification,
  notificationSizeValidator?: AndroidVisualNotification => boolean,
  blobHolder?: ?string,
): Promise<{
  +notification: AndroidVisualNotification,
  +payloadSizeExceeded: boolean,
  +encryptionOrder?: number,
}> {
  const { id, ...rest } = notification.data;

  let unencryptedData = {};
  if (id) {
    unencryptedData = { id };
  }

  let unencryptedPayload = rest;
  if (blobHolder) {
    unencryptedPayload = { ...unencryptedPayload, blobHolder };
  }

  let payloadSizeValidator;
  if (notificationSizeValidator) {
    payloadSizeValidator = (
      payload:
        | AndroidVisualNotificationPayload
        | $ReadOnly<{ ...SenderDeviceDescriptor, +encryptedPayload: string }>,
    ) => {
      return notificationSizeValidator({
        data: { ...unencryptedData, ...payload },
      });
    };
  }
  const { resultPayload, payloadSizeExceeded, encryptionOrder } =
    await encryptAndroidNotificationPayload(
      encryptedNotifUtilsAPI,
      cookieID,
      senderDeviceDescriptor,
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
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  notification: AndroidNotificationRescind | AndroidBadgeOnlyNotification,
): Promise<AndroidNotificationRescind | AndroidBadgeOnlyNotification> {
  // We don't validate payload size for rescind
  // since they are expected to be small and
  // never exceed any FCM limit
  const { ...unencryptedPayload } = notification.data;
  const { resultPayload } = await encryptAndroidNotificationPayload(
    encryptedNotifUtilsAPI,
    cookieID,
    senderDeviceDescriptor,
    unencryptedPayload,
  );
  if (resultPayload.encryptedPayload) {
    return {
      data: { ...resultPayload },
    };
  }

  if (resultPayload.rescind) {
    return {
      data: { ...resultPayload },
    };
  }

  return {
    data: {
      ...resultPayload,
    },
  };
}

async function encryptBasicPayload<T>(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  basicPayload: T,
): Promise<
  | $ReadOnly<{
      ...SenderDeviceDescriptor,
      +encryptedPayload: string,
      +encryptionOrder?: number,
    }>
  | { ...T, +encryptionFailed: '1' },
> {
  const unencryptedSerializedPayload = JSON.stringify(basicPayload);

  if (!unencryptedSerializedPayload) {
    return { ...basicPayload, encryptionFailed: '1' };
  }

  try {
    const { encryptedData: serializedPayload, encryptionOrder } =
      await encryptedNotifUtilsAPI.encryptSerializedNotifPayload(
        cookieID,
        unencryptedSerializedPayload,
      );

    return {
      ...senderDeviceDescriptor,
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
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  notification: PlainTextWebNotification,
): Promise<{ +notification: WebNotification, +encryptionOrder?: number }> {
  const { id, ...payloadSansId } = notification;
  const { encryptionOrder, ...encryptionResult } =
    await encryptBasicPayload<PlainTextWebNotificationPayload>(
      encryptedNotifUtilsAPI,
      cookieID,
      senderDeviceDescriptor,
      payloadSansId,
    );

  return {
    notification: { id, ...encryptionResult },
    encryptionOrder,
  };
}

async function encryptWNSNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  notification: PlainTextWNSNotification,
): Promise<{ +notification: WNSNotification, +encryptionOrder?: number }> {
  const { encryptionOrder, ...encryptionResult } =
    await encryptBasicPayload<PlainTextWNSNotification>(
      encryptedNotifUtilsAPI,
      cookieID,
      senderDeviceDescriptor,
      notification,
    );
  return {
    notification: { ...encryptionResult },
    encryptionOrder,
  };
}

function prepareEncryptedAPNsNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
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
        encryptedNotifUtilsAPI,
        cookieID,
        senderDeviceDescriptor,
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
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
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
        encryptedNotifUtilsAPI,
        cookieID,
        senderDeviceDescriptor,
        notification,
        codeVersion,
      );
      return { deviceToken, cookieID, notification: notif };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedAndroidVisualNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
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
        encryptedNotifUtilsAPI,
        senderDeviceDescriptor,
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
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
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
        encryptedNotifUtilsAPI,
        cookieID,
        senderDeviceDescriptor,
        notification,
      );
      return { deviceToken, cookieID, notification: notif };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedWebNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
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
      const notif = await encryptWebNotification(
        encryptedNotifUtilsAPI,
        cookieID,
        senderDeviceDescriptor,
        notification,
      );
      return { ...notif, deviceToken };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedWNSNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
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
      const notif = await encryptWNSNotification(
        encryptedNotifUtilsAPI,
        cookieID,
        senderDeviceDescriptor,
        notification,
      );
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
