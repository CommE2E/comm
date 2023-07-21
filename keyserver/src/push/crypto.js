// @flow

import apn from '@parse/node-apn';
import invariant from 'invariant';

import type {
  AndroidNotification,
  AndroidNotificationPayload,
  AndroidNotificationRescind,
} from './types.js';
import { encryptAndUpdateOlmSession } from '../updaters/olm-session-updater.js';

async function encryptIOSNotification(
  cookieID: string,
  notification: apn.Notification,
): Promise<apn.Notification> {
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

  let encryptedSerializedPayload;
  try {
    const unencryptedSerializedPayload = JSON.stringify(unencryptedPayload);
    const {
      encryptedMessages: { serializedPayload },
    } = await encryptAndUpdateOlmSession(cookieID, 'notifications', {
      serializedPayload: unencryptedSerializedPayload,
    });
    encryptedSerializedPayload = serializedPayload;
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
    return encryptedNotification;
  }

  encryptedNotification.payload.encryptedPayload =
    encryptedSerializedPayload.body;
  return encryptedNotification;
}

async function encryptAndroidNotificationPayload<T>(
  cookieID: string,
  unencryptedPayload: T,
  payloadSizeValidator?: (T | { +encryptedPayload: string }) => boolean,
): Promise<{
  +resultPayload: T | { +encryptedPayload: string },
  payloadSizeViolated: boolean,
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
  cookieIDs: $ReadOnlyArray<string>,
  notification: apn.Notification,
): Promise<$ReadOnlyArray<apn.Notification>> {
  const notificationPromises = cookieIDs.map(cookieID =>
    encryptIOSNotification(cookieID, notification),
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedAndroidNotifications(
  cookieIDs: $ReadOnlyArray<string>,
  notification: AndroidNotification,
  notificationSizeValidator?: (notification: AndroidNotification) => boolean,
): Promise<
  $ReadOnlyArray<{
    +notification: AndroidNotification,
    +payloadSizeViolated: boolean,
  }>,
> {
  const notificationPromises = cookieIDs.map(cookieID =>
    encryptAndroidNotification(
      cookieID,
      notification,
      notificationSizeValidator,
    ),
  );
  return Promise.all(notificationPromises);
}

function prepareEncryptedAndroidNotificationRescinds(
  cookieIDs: $ReadOnlyArray<string>,
  notification: AndroidNotificationRescind,
): Promise<$ReadOnlyArray<AndroidNotificationRescind>> {
  const notificationPromises = cookieIDs.map(cookieID =>
    encryptAndroidNotificationRescind(cookieID, notification),
  );
  return Promise.all(notificationPromises);
}

export {
  prepareEncryptedIOSNotifications,
  prepareEncryptedAndroidNotifications,
  prepareEncryptedAndroidNotificationRescinds,
};
