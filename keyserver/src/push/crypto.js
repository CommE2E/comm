// @flow

import apn from '@parse/node-apn';
import invariant from 'invariant';
import _cloneDeep from 'lodash/fp/cloneDeep.js';

import type {
  AndroidNotification,
  AndroidNotificationPayload,
  AndroidNotificationRescind,
  NotificationTargetDevice,
} from './types.js';
import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';

async function encryptIOSNotification(
  cookieID: string,
  notification: apn.Notification,
  notificationSizeValidator?: apn.Notification => boolean,
): Promise<{ +notification: apn.Notification, +payloadSizeViolated: boolean }> {
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
    } = await encryptAndUpdateOlmSession(
      cookieID,
      'notifications',
      {
        serializedPayload: unencryptedSerializedPayload,
      },
      dbPersistCondition,
    );

    encryptedNotification.payload.encryptedPayload = serializedPayload.body;
    return {
      notification: encryptedNotification,
      payloadSizeViolated: !!dbPersistConditionViolated,
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
      payloadSizeViolated: notificationSizeValidator
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
  +payloadSizeViolated: boolean,
}> {
  try {
    const unencryptedSerializedPayload = JSON.stringify(unencryptedPayload);
    if (!unencryptedSerializedPayload) {
      return {
        resultPayload: unencryptedPayload,
        payloadSizeViolated: payloadSizeValidator
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
      payloadSizeViolated: !!dbPersistConditionViolated,
    };
  } catch (e) {
    console.log('Notification encryption failed: ' + e);
    const resultPayload = {
      encryptionFailed: '1',
      ...unencryptedPayload,
    };
    return {
      resultPayload,
      payloadSizeViolated: payloadSizeValidator
        ? payloadSizeValidator(unencryptedPayload)
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
  +payloadSizeViolated: boolean,
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
  const { resultPayload, payloadSizeViolated } =
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
    payloadSizeViolated,
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

function prepareEncryptedIOSNotifications(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  notification: apn.Notification,
  notificationSizeValidator?: apn.Notification => boolean,
): Promise<
  $ReadOnlyArray<{
    +cookieID: string,
    +deviceToken: string,
    +notification: apn.Notification,
    +payloadSizeViolated: boolean,
  }>,
> {
  const notificationPromises = devices.map(
    async ({ cookieID, deviceToken }) => {
      const notif = await encryptIOSNotification(
        cookieID,
        notification,
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
    +payloadSizeViolated: boolean,
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

export {
  prepareEncryptedIOSNotifications,
  prepareEncryptedIOSNotificationRescind,
  prepareEncryptedAndroidNotifications,
  prepareEncryptedAndroidNotificationRescinds,
};
