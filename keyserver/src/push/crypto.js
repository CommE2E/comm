// @flow

import apn from '@parse/node-apn';
import crypto from 'crypto';
import invariant from 'invariant';
import _cloneDeep from 'lodash/fp/cloneDeep.js';

import type {
  PlainTextWebNotification,
  WebNotification,
} from 'lib/types/notif-types.js';
import { toBase64URL } from 'lib/utils/base64.js';

import type {
  AndroidNotification,
  AndroidNotificationPayload,
  AndroidNotificationRescind,
  NotificationTargetDevice,
} from './types.js';
import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';
import { encrypt, generateKey } from '../utils/aes-crypto-utils.js';
import { getOlmUtility } from '../utils/olm-utils.js';

async function encryptIOSNotification(
  cookieID: string,
  notification: apn.Notification,
  codeVersion?: ?number,
  notificationSizeValidator?: apn.Notification => boolean,
): Promise<{
  +notification: apn.Notification,
  +payloadSizeExceeded: boolean,
  +encryptedPayloadHash?: string,
  +encryptionOrder?: number,
}> {
  invariant(
    !notification.collapseId,
    'Collapsible notifications encryption currently not implemented',
  );

  const encryptedNotification = new apn.Notification();

  encryptedNotification.id = notification.id;
  encryptedNotification.payload.id = notification.id;
  encryptedNotification.topic = notification.topic;
  encryptedNotification.sound = notification.aps.sound;
  encryptedNotification.pushType = 'alert';
  encryptedNotification.mutableContent = true;

  const { id, ...payloadSansId } = notification.payload;
  const unencryptedPayload = {
    ...payloadSansId,
    badge: notification.aps.badge.toString(),
    merged: notification.body,
  };

  try {
    const unencryptedSerializedPayload = JSON.stringify(unencryptedPayload);

    let dbPersistCondition;
    if (notificationSizeValidator) {
      dbPersistCondition = ({ serializedPayload }) => {
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
      dbPersistCondition = ({ serializedPayload }) =>
        payloadSizeValidator({ encryptedPayload: serializedPayload.body });
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

async function encryptAndroidNotification(
  cookieID: string,
  notification: AndroidNotification,
  notificationSizeValidator?: AndroidNotification => boolean,
): Promise<{
  +notification: AndroidNotification,
  +payloadSizeExceeded: boolean,
  +encryptionOrder?: number,
}> {
  const { id, badgeOnly, ...unencryptedPayload } = notification.data;
  let payloadSizeValidator;
  if (notificationSizeValidator) {
    payloadSizeValidator = (
      payload: AndroidNotificationPayload | { +encryptedPayload: string },
    ) => {
      return notificationSizeValidator({ data: { id, badgeOnly, ...payload } });
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
        id,
        badgeOnly,
        ...resultPayload,
      },
    },
    payloadSizeExceeded,
    encryptionOrder,
  };
}

async function encryptAndroidNotificationRescind(
  cookieID: string,
  notification: AndroidNotificationRescind,
): Promise<AndroidNotificationRescind> {
  // We don't validate payload size for rescind
  // since they are expected to be small and
  // never exceed any FCM limit
  const { resultPayload } = await encryptAndroidNotificationPayload(
    cookieID,
    notification.data,
  );
  return {
    data: resultPayload,
  };
}

async function encryptWebNotification(
  cookieID: string,
  notification: PlainTextWebNotification,
): Promise<{ +notification: WebNotification, +encryptionOrder?: number }> {
  const { id, ...payloadSansId } = notification;
  const unencryptedSerializedPayload = JSON.stringify(payloadSansId);

  try {
    const {
      encryptedMessages: { serializedPayload },
      encryptionOrder,
    } = await encryptAndUpdateOlmSession(cookieID, 'notifications', {
      serializedPayload: unencryptedSerializedPayload,
    });

    return {
      notification: { id, encryptedPayload: serializedPayload.body },
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed: ' + e);
    return {
      notification: {
        id,
        encryptionFailed: '1',
        ...payloadSansId,
      },
    };
  }
}

function prepareEncryptedIOSNotifications(
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
    async ({ cookieID, deviceToken }) => {
      const notif = await encryptIOSNotification(
        cookieID,
        notification,
        codeVersion,
        notificationSizeValidator,
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
      const { notification: notif } = await encryptIOSNotification(
        cookieID,
        notification,
        codeVersion,
      );
      return { deviceToken, cookieID, notification: notif };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedAndroidNotifications(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: AndroidNotification,
  notificationSizeValidator?: (notification: AndroidNotification) => boolean,
): Promise<
  $ReadOnlyArray<{
    +cookieID: string,
    +deviceToken: string,
    +notification: AndroidNotification,
    +payloadSizeExceeded: boolean,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ deviceToken, cookieID }) => {
      const notif = await encryptAndroidNotification(
        cookieID,
        notification,
        notificationSizeValidator,
      );
      return { deviceToken, cookieID, ...notif };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedAndroidNotificationRescinds(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: AndroidNotificationRescind,
): Promise<
  $ReadOnlyArray<{
    +cookieID: string,
    +deviceToken: string,
    +notification: AndroidNotificationRescind,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ deviceToken, cookieID }) => {
      const notif = await encryptAndroidNotificationRescind(
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
  prepareEncryptedIOSNotifications,
  prepareEncryptedIOSNotificationRescind,
  prepareEncryptedAndroidNotifications,
  prepareEncryptedAndroidNotificationRescinds,
  prepareEncryptedWebNotifications,
  encryptBlobPayload,
};
