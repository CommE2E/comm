// @flow

import invariant from 'invariant';

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
  SenderDeviceID,
  EncryptedNotifUtilsAPI,
  APNsVisualNotification,
  APNsNotificationRescind,
  APNsBadgeOnlyNotification,
} from '../types/notif-types.js';

async function encryptAndroidNotificationPayload<T>(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
  senderDeviceID: SenderDeviceID,
  unencryptedPayload: T,
  payloadSizeValidator?: (
    T | $ReadOnly<{ ...SenderDeviceID, +encryptedPayload: string }>,
  ) => boolean,
): Promise<{
  +resultPayload:
    | T
    | $ReadOnly<{ ...SenderDeviceID, +encryptedPayload: string }>,
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
          ...senderDeviceID,
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
        ...senderDeviceID,
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

async function encryptAPNsVisualNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
  senderDeviceID: SenderDeviceID,
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
    `Collapse ID can't be directly stored in apn.Notification object due ` +
      `to security reasons. Please put it in payload property`,
  );

  let unencryptedPayload = {
    ...rest,
    aps: { sound },
    merged: alert,
    badge,
  };

  if (blobHolder) {
    unencryptedPayload = { ...unencryptedPayload, blobHolder };
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

    let dbPersistCondition;
    if (notificationSizeValidator) {
      dbPersistCondition = (encryptedPayload: string) =>
        notificationSizeValidator({
          ...senderDeviceID,
          id,
          headers,
          encryptedPayload,
          aps: encryptedNotifAps,
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

    const encryptedPayloadHash = encryptedNotifUtilsAPI.getEncryptedNotifHash(
      serializedPayload.body,
    );

    return {
      notification: {
        ...senderDeviceID,
        id,
        headers,
        encryptedPayload: serializedPayload.body,
        aps: encryptedNotifAps,
      },
      payloadSizeExceeded: !!dbPersistConditionViolated,
      encryptedPayloadHash,
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed: ' + e);
    const unencryptedNotification = { ...notification, encryptionFailed: '1' };
    return {
      notification: unencryptedNotification,
      payloadSizeExceeded: notificationSizeValidator
        ? notificationSizeValidator(unencryptedNotification)
        : false,
    };
  }
}

async function encryptAPNsSilentNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
  senderDeviceID: SenderDeviceID,
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
        cookieID,
        unencryptedSerializedPayload,
      );

    const encryptedPayloadHash = encryptedNotifUtilsAPI.getEncryptedNotifHash(
      serializedPayload.body,
    );

    return {
      notification: {
        ...senderDeviceID,
        headers,
        encryptedPayload: serializedPayload.body,
        aps: encryptedNotifAps,
      },
      encryptedPayloadHash,
      encryptionOrder,
    };
  } catch (e) {
    console.log('Notification encryption failed: ' + e);
    const unencryptedNotification = { ...notification, encryptionFailed: '1' };
    return {
      notification: unencryptedNotification,
    };
  }
}

async function encryptAndroidVisualNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceID: SenderDeviceID,
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
        | $ReadOnly<{ ...SenderDeviceID, +encryptedPayload: string }>,
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
      senderDeviceID,
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
  senderDeviceID: SenderDeviceID,
  notification: AndroidNotificationRescind | AndroidBadgeOnlyNotification,
): Promise<AndroidNotificationRescind | AndroidBadgeOnlyNotification> {
  // We don't validate payload size for rescind
  // since they are expected to be small and
  // never exceed any FCM limit
  const { ...unencryptedPayload } = notification.data;
  const { resultPayload } = await encryptAndroidNotificationPayload(
    encryptedNotifUtilsAPI,
    cookieID,
    senderDeviceID,
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
  senderDeviceID: SenderDeviceID,
  basicPayload: T,
): Promise<
  | $ReadOnly<{
      ...SenderDeviceID,
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
      ...senderDeviceID,
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
  senderDeviceID: SenderDeviceID,
  notification: PlainTextWebNotification,
): Promise<{ +notification: WebNotification, +encryptionOrder?: number }> {
  const { id, ...payloadSansId } = notification;
  const { encryptionOrder, ...encryptionResult } =
    await encryptBasicPayload<PlainTextWebNotificationPayload>(
      encryptedNotifUtilsAPI,
      cookieID,
      senderDeviceID,
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
  senderDeviceID: SenderDeviceID,
  notification: PlainTextWNSNotification,
): Promise<{ +notification: WNSNotification, +encryptionOrder?: number }> {
  const { encryptionOrder, ...encryptionResult } =
    await encryptBasicPayload<PlainTextWNSNotification>(
      encryptedNotifUtilsAPI,
      cookieID,
      senderDeviceID,
      notification,
    );
  return {
    notification: { ...encryptionResult },
    encryptionOrder,
  };
}

function prepareEncryptedAPNsVisualNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceID: SenderDeviceID,
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
        senderDeviceID,
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
  senderDeviceID: SenderDeviceID,
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
      senderDeviceID,
      notification,
      codeVersion,
    );
    return { cryptoID, deliveryID, notification: notif };
  });
  return Promise.all(notificationPromises);
}

function prepareEncryptedAndroidVisualNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceID: SenderDeviceID,
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
        senderDeviceID,
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
  senderDeviceID: SenderDeviceID,
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
      senderDeviceID,
      notification,
    );
    return { deliveryID, cryptoID, notification: notif };
  });
  return Promise.all(notificationPromises);
}

function prepareEncryptedWebNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceID: SenderDeviceID,
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
      senderDeviceID,
      notification,
    );
    return { ...notif, deliveryID };
  });
  return Promise.all(notificationPromises);
}

function prepareEncryptedWNSNotifications(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  senderDeviceID: SenderDeviceID,
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
      senderDeviceID,
      notification,
    );
    return { ...notif, deliveryID };
  });
  return Promise.all(notificationPromises);
}

export {
  prepareEncryptedAPNsVisualNotifications,
  prepareEncryptedAPNsSilentNotifications,
  prepareEncryptedAndroidVisualNotifications,
  prepareEncryptedAndroidSilentNotifications,
  prepareEncryptedWebNotifications,
  prepareEncryptedWNSNotifications,
};
