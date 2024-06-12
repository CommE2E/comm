// @flow

import invariant from 'invariant';
import t, { type TInterface } from 'tcomb';

import {
  prepareEncryptedAndroidVisualNotifications,
  prepareEncryptedAndroidSilentNotifications,
} from './crypto.js';
import {
  hasMinCodeVersion,
  FUTURE_CODE_VERSION,
} from '../shared/version-utils.js';
import type { PlatformDetails } from '../types/device-types.js';
import { messageTypes } from '../types/message-types-enum.js';
import {
  type RawMessageInfo,
  rawMessageInfoValidator,
} from '../types/message-types.js';
import {
  type AndroidVisualNotification,
  type NotificationTargetDevice,
  type TargetedAndroidNotification,
  type ResolvedNotifTexts,
  resolvedNotifTextsValidator,
  type SenderDeviceDescriptor,
  senderDeviceDescriptorValidator,
  type EncryptedNotifUtilsAPI,
  type AndroidBadgeOnlyNotification,
} from '../types/notif-types.js';
import { tID, tPlatformDetails, tShape } from '../utils/validation-utils.js';

export const fcmMaxNotificationPayloadByteSize = 4000;

type CommonNativeNotifInputData = $ReadOnly<{
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +notifTexts: ResolvedNotifTexts,
  +newRawMessageInfos: RawMessageInfo[],
  +threadID: string,
  +collapseKey: ?string,
  +badgeOnly: boolean,
  +unreadCount?: number,
  +platformDetails: PlatformDetails,
}>;

const commonNativeNotifInputDataValidator = tShape<CommonNativeNotifInputData>({
  senderDeviceDescriptor: senderDeviceDescriptorValidator,
  notifTexts: resolvedNotifTextsValidator,
  newRawMessageInfos: t.list(rawMessageInfoValidator),
  threadID: tID,
  collapseKey: t.maybe(t.String),
  badgeOnly: t.Boolean,
  unreadCount: t.maybe(t.Number),
  platformDetails: tPlatformDetails,
});

export type AndroidNotifInputData = {
  ...CommonNativeNotifInputData,
  +notifID: string,
};

export const androidNotifInputDataValidator: TInterface<AndroidNotifInputData> =
  tShape<AndroidNotifInputData>({
    ...commonNativeNotifInputDataValidator.meta.props,
    notifID: t.String,
  });

async function createAndroidVisualNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: AndroidNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAndroidNotification>> {
  const {
    senderDeviceDescriptor,
    notifTexts,
    newRawMessageInfos,
    threadID,
    collapseKey,
    badgeOnly,
    unreadCount,
    platformDetails,
    notifID,
  } = inputData;

  const canDecryptNonCollapsibleTextNotifs = hasMinCodeVersion(
    platformDetails,
    { native: 228 },
  );
  const isNonCollapsibleTextNotif =
    newRawMessageInfos.every(
      newRawMessageInfo => newRawMessageInfo.type === messageTypes.TEXT,
    ) && !collapseKey;

  const canDecryptAllNotifTypes = hasMinCodeVersion(platformDetails, {
    native: 267,
  });

  const shouldBeEncrypted =
    canDecryptAllNotifTypes ||
    (canDecryptNonCollapsibleTextNotifs && isNonCollapsibleTextNotif);

  const { merged, ...rest } = notifTexts;
  const notification = {
    data: {
      ...rest,
      threadID,
    },
  };

  if (unreadCount) {
    notification.data = {
      ...notification.data,
      badge: unreadCount.toString(),
    };
  }

  let id;
  if (collapseKey && canDecryptAllNotifTypes) {
    id = notifID;
    notification.data = {
      ...notification.data,
      collapseKey,
    };
  } else if (collapseKey) {
    id = collapseKey;
  } else {
    id = notifID;
  }

  notification.data = {
    ...notification.data,
    id,
    badgeOnly: badgeOnly ? '1' : '0',
  };

  const messageInfos = JSON.stringify(newRawMessageInfos);
  const copyWithMessageInfos = {
    ...notification,
    data: { ...notification.data, messageInfos },
  };

  const priority = 'high';
  if (!shouldBeEncrypted) {
    const notificationToSend =
      encryptedNotifUtilsAPI.getNotifByteSize(
        JSON.stringify(copyWithMessageInfos),
      ) <= fcmMaxNotificationPayloadByteSize
        ? copyWithMessageInfos
        : notification;

    return devices.map(({ deliveryID }) => ({
      priority,
      notification: notificationToSend,
      deliveryID,
    }));
  }

  const notificationsSizeValidator = (notif: AndroidVisualNotification) => {
    const serializedNotif = JSON.stringify(notif);
    return (
      !serializedNotif ||
      encryptedNotifUtilsAPI.getNotifByteSize(serializedNotif) <=
        fcmMaxNotificationPayloadByteSize
    );
  };

  const notifsWithMessageInfos =
    await prepareEncryptedAndroidVisualNotifications(
      encryptedNotifUtilsAPI,
      senderDeviceDescriptor,
      devices,
      copyWithMessageInfos,
      notificationsSizeValidator,
    );

  const devicesWithExcessiveSizeNoHolders = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => payloadSizeExceeded)
    .map(({ cryptoID, deliveryID }) => ({ cryptoID, deliveryID }));

  if (devicesWithExcessiveSizeNoHolders.length === 0) {
    return notifsWithMessageInfos.map(
      ({ notification: notif, deliveryID, encryptionOrder }) => ({
        priority,
        notification: notif,
        deliveryID,
        encryptionOrder,
      }),
    );
  }

  const canQueryBlobService = hasMinCodeVersion(platformDetails, {
    native: 331,
  });

  let blobHash, blobHolders, encryptionKey, blobUploadError;
  if (canQueryBlobService) {
    ({ blobHash, blobHolders, encryptionKey, blobUploadError } =
      await encryptedNotifUtilsAPI.uploadLargeNotifPayload(
        JSON.stringify(copyWithMessageInfos.data),
        devicesWithExcessiveSizeNoHolders.length,
      ));
  }

  if (blobUploadError) {
    console.warn(
      `Failed to upload payload of notification: ${notifID} ` +
        `due to error: ${blobUploadError}`,
    );
  }

  let devicesWithExcessiveSize = devicesWithExcessiveSizeNoHolders;
  if (
    blobHash &&
    encryptionKey &&
    blobHolders &&
    blobHolders.length === devicesWithExcessiveSizeNoHolders.length
  ) {
    notification.data = {
      ...notification.data,
      blobHash,
      encryptionKey,
    };

    devicesWithExcessiveSize = blobHolders.map((holder, idx) => ({
      ...devicesWithExcessiveSize[idx],
      blobHolder: holder,
    }));
  }

  const notifsWithoutMessageInfos =
    await prepareEncryptedAndroidVisualNotifications(
      encryptedNotifUtilsAPI,
      senderDeviceDescriptor,
      devicesWithExcessiveSize,
      notification,
    );

  const targetedNotifsWithMessageInfos = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => !payloadSizeExceeded)
    .map(({ notification: notif, deliveryID, encryptionOrder }) => ({
      priority,
      notification: notif,
      deliveryID,
      encryptionOrder,
    }));

  const targetedNotifsWithoutMessageInfos = notifsWithoutMessageInfos.map(
    ({ notification: notif, deliveryID, encryptionOrder }) => ({
      priority,
      notification: notif,
      deliveryID,
      encryptionOrder,
    }),
  );

  return [
    ...targetedNotifsWithMessageInfos,
    ...targetedNotifsWithoutMessageInfos,
  ];
}
type AndroidNotificationRescindInputData = {
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +threadID: string,
  +rescindID?: string,
  +badge?: string,
  +platformDetails: PlatformDetails,
};

async function createAndroidNotificationRescind(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: AndroidNotificationRescindInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAndroidNotification>> {
  const {
    senderDeviceDescriptor,
    platformDetails,
    threadID,
    rescindID,
    badge,
  } = inputData;

  let notification = {
    data: {
      rescind: 'true',
      setUnreadStatus: 'true',
      threadID,
    },
  };

  invariant(
    (rescindID && badge) ||
      hasMinCodeVersion(platformDetails, { native: FUTURE_CODE_VERSION }),
    'thick thread rescind not support for this client version',
  );

  if (rescindID && badge) {
    notification = {
      ...notification,
      data: {
        ...notification.data,
        badge,
        rescindID,
      },
    };
  }

  const shouldBeEncrypted = hasMinCodeVersion(platformDetails, { native: 233 });
  if (!shouldBeEncrypted) {
    return devices.map(({ deliveryID }) => ({
      notification,
      deliveryID,
      priority: 'normal',
    }));
  }

  const notifications = await prepareEncryptedAndroidSilentNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    devices,
    notification,
  );

  return notifications.map(({ deliveryID, notification: notif }) => ({
    deliveryID,
    notification: notif,
    priority: 'normal',
  }));
}

type SenderDescriptorWithPlatformDetails = {
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +platformDetails: PlatformDetails,
};

type AndroidBadgeOnlyNotificationInputData = $ReadOnly<
  | {
      ...SenderDescriptorWithPlatformDetails,
      +badge: string,
    }
  | { ...SenderDescriptorWithPlatformDetails, +threadID: string },
>;

async function createAndroidBadgeOnlyNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: AndroidBadgeOnlyNotificationInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAndroidNotification>> {
  const { senderDeviceDescriptor, platformDetails, badge, threadID } =
    inputData;

  invariant(
    (!threadID && badge) ||
      hasMinCodeVersion(platformDetails, { native: FUTURE_CODE_VERSION }),
    'thick thread badge updates not support for this client version',
  );

  let notificationData = { badgeOnly: '1' };
  if (badge) {
    notificationData = {
      ...notificationData,
      badge,
    };
  } else {
    invariant(
      threadID,
      'Either badge or threadID must be present in badge only notif',
    );
    notificationData = {
      ...notificationData,
      threadID,
    };
  }

  const notification: AndroidBadgeOnlyNotification = { data: notificationData };
  const shouldBeEncrypted = hasMinCodeVersion(platformDetails, { native: 222 });

  if (!shouldBeEncrypted) {
    return devices.map(({ deliveryID }) => ({
      notification,
      deliveryID,
      priority: 'normal',
    }));
  }

  const notifications = await prepareEncryptedAndroidSilentNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    devices,
    notification,
  );

  return notifications.map(
    ({ notification: notif, deliveryID, encryptionOrder }) => ({
      priority: 'normal',
      notification: notif,
      deliveryID,
      encryptionOrder,
    }),
  );
}

export {
  createAndroidVisualNotification,
  createAndroidBadgeOnlyNotification,
  createAndroidNotificationRescind,
};
