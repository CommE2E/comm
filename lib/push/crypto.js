// @flow

import invariant from 'invariant';
import uuid from 'uuid';

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
  APNsVisualNotification,
  APNsNotificationRescind,
  APNsBadgeOnlyNotification,
} from '../types/notif-types.js';
import { toBase64URL } from '../utils/base64.js';

async function encryptAndroidNotificationPayload<T>(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cryptoID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  unencryptedPayload: T,
  payloadSizeValidator?: (
    | T
    | $ReadOnly<{
        ...SenderDeviceDescriptor,
        +encryptedPayload: string,
        +type: '1' | '0',
      }>,
  ) => boolean,
): Promise<{
  +resultPayload:
    | T
    | $ReadOnly<{
        ...SenderDeviceDescriptor,
        +encryptedPayload: string,
        +type: '1' | '0',
      }>,
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
      dbPersistCondition = (serializedPayload: string, type: '1' | '0') =>
        payloadSizeValidator({
          encryptedPayload: serializedPayload,
          type,
          ...senderDeviceDescriptor,
        });
    }

    const {
      encryptedData: serializedPayload,
      sizeLimitViolated: dbPersistConditionViolated,
      encryptionOrder,
    } = await encryptedNotifUtilsAPI.encryptSerializedNotifPayload(
      cryptoID,
      unencryptedSerializedPayload,
      dbPersistCondition,
    );

    return {
      resultPayload: {
        ...senderDeviceDescriptor,
        encryptedPayload: serializedPayload.body,
        type: serializedPayload.type ? '1' : '0',
      },
      payloadSizeExceeded: !!dbPersistConditionViolated,
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed', e);
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

async function encryptAPNsVisualNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cryptoID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  notification: APNsVisualNotification,
  notificationSizeValidator?: APNsVisualNotification => boolean,
  codeVersion?: ?number,
  blobHolder?: ?string,
): Promise<{
  +notification: APNsVisualNotification,
  +payloadSizeExceeded: boolean,
  +encryptedPayloadHash?: string,
  +encryptionOrder?: number,
}> {
  const {
    id,
    headers,
    aps: { badge, alert, sound },
    ...rest
  } = notification;

  invariant(
    !headers['apns-collapse-id'],
    `Collapse ID can't be directly stored in APNsVisualNotification object due ` +
      `to security reasons. Please put it in payload property`,
  );

  let unencryptedPayload = {
    ...rest,
    merged: alert,
    badge,
  };

  if (blobHolder) {
    unencryptedPayload = { ...unencryptedPayload, blobHolder };
  }

  try {
    const unencryptedSerializedPayload = JSON.stringify(unencryptedPayload);

    let encryptedNotifAps = { 'mutable-content': 1, sound };
    if (codeVersion && codeVersion >= 254 && codeVersion % 2 === 0) {
      encryptedNotifAps = {
        ...encryptedNotifAps,
        alert: { body: 'ENCRYPTED' },
      };
    }

    let dbPersistCondition;
    if (notificationSizeValidator) {
      dbPersistCondition = (encryptedPayload: string, type: '0' | '1') =>
        notificationSizeValidator({
          ...senderDeviceDescriptor,
          id,
          headers,
          encryptedPayload,
          type,
          aps: encryptedNotifAps,
        });
    }

    const {
      encryptedData: serializedPayload,
      sizeLimitViolated: dbPersistConditionViolated,
      encryptionOrder,
    } = await encryptedNotifUtilsAPI.encryptSerializedNotifPayload(
      cryptoID,
      unencryptedSerializedPayload,
      dbPersistCondition,
    );

    const encryptedPayloadHash =
      await encryptedNotifUtilsAPI.getEncryptedNotifHash(
        serializedPayload.body,
      );

    return {
      notification: {
        ...senderDeviceDescriptor,
        id,
        headers,
        encryptedPayload: serializedPayload.body,
        type: serializedPayload.type ? '1' : '0',
        aps: encryptedNotifAps,
      },
      payloadSizeExceeded: !!dbPersistConditionViolated,
      encryptedPayloadHash,
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed', e);
    const unencryptedNotification = { ...notification, encryptionFailed: '1' };
    return {
      notification: unencryptedNotification,
      payloadSizeExceeded: notificationSizeValidator
        ? !notificationSizeValidator(unencryptedNotification)
        : false,
    };
  }
}

async function encryptAPNsSilentNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cryptoID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  notification: APNsNotificationRescind | APNsBadgeOnlyNotification,
  codeVersion?: ?number,
): Promise<{
  +notification: APNsNotificationRescind | APNsBadgeOnlyNotification,
  +encryptedPayloadHash?: string,
  +encryptionOrder?: number,
}> {
  const {
    headers,
    aps: { badge },
    ...rest
  } = notification;

  let unencryptedPayload = {
    ...rest,
  };

  if (badge !== null && badge !== undefined) {
    unencryptedPayload = { ...unencryptedPayload, badge, aps: {} };
  }

  try {
    const unencryptedSerializedPayload = JSON.stringify(unencryptedPayload);

    let encryptedNotifAps = { 'mutable-content': 1 };
    if (codeVersion && codeVersion >= 254 && codeVersion % 2 === 0) {
      encryptedNotifAps = {
        ...encryptedNotifAps,
        alert: { body: 'ENCRYPTED' },
      };
    }

    const { encryptedData: serializedPayload, encryptionOrder } =
      await encryptedNotifUtilsAPI.encryptSerializedNotifPayload(
        cryptoID,
        unencryptedSerializedPayload,
      );

    const encryptedPayloadHash =
      await encryptedNotifUtilsAPI.getEncryptedNotifHash(
        serializedPayload.body,
      );

    return {
      notification: {
        ...senderDeviceDescriptor,
        headers,
        encryptedPayload: serializedPayload.body,
        type: serializedPayload.type ? '1' : '0',
        aps: encryptedNotifAps,
      },
      encryptedPayloadHash,
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed', e);
    const unencryptedNotification = { ...notification, encryptionFailed: '1' };
    return {
      notification: unencryptedNotification,
    };
  }
}

async function encryptAndroidVisualNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  cryptoID: string,
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
        | $ReadOnly<{
            ...SenderDeviceDescriptor,
            +encryptedPayload: string,
            +type: '0' | '1',
          }>,
    ) => {
      return notificationSizeValidator({
        data: { ...unencryptedData, ...payload },
      });
    };
  }
  const { resultPayload, payloadSizeExceeded, encryptionOrder } =
    await encryptAndroidNotificationPayload(
      encryptedNotifUtilsAPI,
      cryptoID,
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
  cryptoID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  notification: AndroidNotificationRescind | AndroidBadgeOnlyNotification,
): Promise<AndroidNotificationRescind | AndroidBadgeOnlyNotification> {
  // We don't validate payload size for rescind
  // since they are expected to be small and
  // never exceed any FCM limit
  const { ...unencryptedPayload } = notification.data;
  const { resultPayload } = await encryptAndroidNotificationPayload(
    encryptedNotifUtilsAPI,
    cryptoID,
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
  cryptoID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  basicPayload: T,
): Promise<
  | $ReadOnly<{
      ...SenderDeviceDescriptor,
      +encryptedPayload: string,
      +type: '1' | '0',
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
        cryptoID,
        unencryptedSerializedPayload,
      );

    return {
      ...senderDeviceDescriptor,
      encryptedPayload: serializedPayload.body,
      type: serializedPayload.type ? '1' : '0',
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed', e);
    return {
      ...basicPayload,
      encryptionFailed: '1',
    };
  }
}

async function encryptWebNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cryptoID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  notification: PlainTextWebNotification,
): Promise<{ +notification: WebNotification, +encryptionOrder?: number }> {
  const { id, ...payloadSansId } = notification;
  const { encryptionOrder, ...encryptionResult } =
    await encryptBasicPayload<PlainTextWebNotificationPayload>(
      encryptedNotifUtilsAPI,
      cryptoID,
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
  cryptoID: string,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  notification: PlainTextWNSNotification,
): Promise<{ +notification: WNSNotification, +encryptionOrder?: number }> {
  const { encryptionOrder, ...encryptionResult } =
    await encryptBasicPayload<PlainTextWNSNotification>(
      encryptedNotifUtilsAPI,
      cryptoID,
      senderDeviceDescriptor,
      notification,
    );
  return {
    notification: { ...encryptionResult },
    encryptionOrder,
  };
}

function prepareEncryptedAPNsVisualNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: APNsVisualNotification,
  codeVersion?: ?number,
  notificationSizeValidator?: APNsVisualNotification => boolean,
): Promise<
  $ReadOnlyArray<{
    +cryptoID: string,
    +deliveryID: string,
    +notification: APNsVisualNotification,
    +payloadSizeExceeded: boolean,
    +encryptedPayloadHash?: string,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ cryptoID, deliveryID, blobHolder }) => {
      const notif = await encryptAPNsVisualNotification(
        encryptedNotifUtilsAPI,
        cryptoID,
        senderDeviceDescriptor,
        notification,
        notificationSizeValidator,
        codeVersion,
        blobHolder,
      );
      return { cryptoID, deliveryID, ...notif };
    },
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedAPNsSilentNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: APNsNotificationRescind | APNsBadgeOnlyNotification,
  codeVersion?: ?number,
): Promise<
  $ReadOnlyArray<{
    +cryptoID: string,
    +deliveryID: string,
    +notification: APNsNotificationRescind | APNsBadgeOnlyNotification,
  }>,
> {
  const notificationPromises = devices.map(async ({ deliveryID, cryptoID }) => {
    const { notification: notif } = await encryptAPNsSilentNotification(
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
    +cryptoID: string,
    +deliveryID: string,
    +notification: AndroidVisualNotification,
    +payloadSizeExceeded: boolean,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ deliveryID, cryptoID, blobHolder }) => {
      const notif = await encryptAndroidVisualNotification(
        encryptedNotifUtilsAPI,
        senderDeviceDescriptor,
        cryptoID,
        notification,
        notificationSizeValidator,
        blobHolder,
      );
      return { deliveryID, cryptoID, ...notif };
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
    +cryptoID: string,
    +deliveryID: string,
    +notification: AndroidNotificationRescind | AndroidBadgeOnlyNotification,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(async ({ deliveryID, cryptoID }) => {
    const notif = await encryptAndroidSilentNotification(
      encryptedNotifUtilsAPI,
      cryptoID,
      senderDeviceDescriptor,
      notification,
    );
    return { deliveryID, cryptoID, notification: notif };
  });
  return Promise.all(notificationPromises);
}

function prepareEncryptedWebNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: PlainTextWebNotification,
): Promise<
  $ReadOnlyArray<{
    +deliveryID: string,
    +notification: WebNotification,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(async ({ deliveryID, cryptoID }) => {
    const notif = await encryptWebNotification(
      encryptedNotifUtilsAPI,
      cryptoID,
      senderDeviceDescriptor,
      notification,
    );
    return { ...notif, deliveryID };
  });
  return Promise.all(notificationPromises);
}

function prepareEncryptedWNSNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceDescriptor: SenderDeviceDescriptor,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: PlainTextWNSNotification,
): Promise<
  $ReadOnlyArray<{
    +deliveryID: string,
    +notification: WNSNotification,
    +encryptionOrder?: number,
  }>,
> {
  const notificationPromises = devices.map(async ({ deliveryID, cryptoID }) => {
    const notif = await encryptWNSNotification(
      encryptedNotifUtilsAPI,
      cryptoID,
      senderDeviceDescriptor,
      notification,
    );
    return { ...notif, deliveryID };
  });
  return Promise.all(notificationPromises);
}

export type LargeNotifEncryptionResult = {
  +blobHash: string,
  +encryptionKey: string,
  +encryptedCopyWithMessageInfos: Uint8Array,
};

export type LargeNotifData = $ReadOnly<{
  ...LargeNotifEncryptionResult,
  +blobHolders: $ReadOnlyArray<string>,
}>;

function generateBlobHolders(numberOfDevices: number): $ReadOnlyArray<string> {
  return Array.from({ length: numberOfDevices }, () => uuid.v4());
}

async function prepareLargeNotifData(
  copyWithMessageInfos: string,
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
): Promise<LargeNotifEncryptionResult> {
  const encryptionKey = await encryptedNotifUtilsAPI.generateAESKey();
  const encryptedCopyWithMessageInfos =
    await encryptedNotifUtilsAPI.encryptWithAESKey(
      encryptionKey,
      copyWithMessageInfos,
    );
  const blobHash = await encryptedNotifUtilsAPI.getBlobHash(
    encryptedCopyWithMessageInfos,
  );
  const blobHashBase64url = toBase64URL(blobHash);
  return {
    blobHash: blobHashBase64url,
    encryptedCopyWithMessageInfos,
    encryptionKey,
  };
}

export {
  prepareEncryptedAPNsVisualNotifications,
  prepareEncryptedAPNsSilentNotifications,
  prepareEncryptedAndroidVisualNotifications,
  prepareEncryptedAndroidSilentNotifications,
  prepareEncryptedWebNotifications,
  prepareEncryptedWNSNotifications,
  prepareLargeNotifData,
  generateBlobHolders,
};
