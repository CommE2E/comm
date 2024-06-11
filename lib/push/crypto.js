// @flow

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
} from '../types/notif-types.js';

async function encryptAndroidNotificationPayload<T>(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  cookieID: string,
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
      cookieID,
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
        cookieID,
        unencryptedSerializedPayload,
      );

    return {
      ...senderDeviceDescriptor,
      encryptedPayload: serializedPayload.body,
      type: serializedPayload.type ? '1' : '0',
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

export {
  prepareEncryptedAndroidVisualNotifications,
  prepareEncryptedAndroidSilentNotifications,
  prepareEncryptedWebNotifications,
  prepareEncryptedWNSNotifications,
};
