// @flow

import apn from '@parse/node-apn';
import crypto from 'crypto';
import invariant from 'invariant';
import _cloneDeep from 'lodash/fp/cloneDeep.js';

import type {
  NotificationTargetDevice,
  SenderDeviceDescriptor,
  EncryptedNotifUtilsAPI,
} from 'lib/types/notif-types.js';
import { toBase64URL } from 'lib/utils/base64.js';
import { getOlmUtility } from 'lib/utils/olm-utility.js';

import { encrypt, generateKey } from '../utils/aes-crypto-utils.js';

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
      ...senderDeviceDescriptor,
      encryptionFailed: '1',
    };

    return {
      notification: encryptedNotification,
      payloadSizeExceeded: notificationSizeValidator
        ? notificationSizeValidator(_cloneDeep(encryptedNotification))
        : false,
    };
  }
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
    +cryptoID: string,
    +deliveryID: string,
    +notification: apn.Notification,
    +payloadSizeExceeded: boolean,
    +encryptedPayloadHash?: string,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ cryptoID, deliveryID, blobHolder }) => {
      const notif = await encryptAPNsNotification(
        encryptedNotifUtilsAPI,
        cryptoID,
        senderDeviceDescriptor,
        notification,
        codeVersion,
        notificationSizeValidator,
        blobHolder,
      );
      return { cryptoID, deliveryID, ...notif };
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
    +cryptoID: string,
    +deliveryID: string,
    +notification: apn.Notification,
  }>,
> {
  const notificationPromises = devices.map(async ({ deliveryID, cryptoID }) => {
    const { notification: notif } = await encryptAPNsNotification(
      encryptedNotifUtilsAPI,
      cryptoID,
      senderDeviceDescriptor,
      notification,
      codeVersion,
    );
    return { cryptoID, deliveryID, notification: notif };
  });
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
  encryptBlobPayload,
};
