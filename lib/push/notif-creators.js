// @flow
import t, { type TInterface } from 'tcomb';

import {
  prepareEncryptedAndroidVisualNotifications,
  prepareEncryptedWNSNotifications,
  prepareEncryptedWebNotifications,
} from './crypto.js';
import { hasMinCodeVersion } from '../shared/version-utils.js';
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
  type TargetedWebNotification,
  type TargetedWNSNotification,
  type ResolvedNotifTexts,
  resolvedNotifTextsValidator,
  type SenderDeviceID,
  senderDeviceIDValidator,
  type EncryptedNotifUtilsAPI,
} from '../types/notif-types.js';
import { tID, tPlatformDetails, tShape } from '../utils/validation-utils.js';

export const fcmMaxNotificationPayloadByteSize = 4000;
export const wnsMaxNotificationPayloadByteSize = 5000;

type CommonNativeNotifInputData = $ReadOnly<{
  +senderDeviceID: SenderDeviceID,
  +notifTexts: ResolvedNotifTexts,
  +newRawMessageInfos: RawMessageInfo[],
  +threadID: string,
  +collapseKey: ?string,
  +unreadCount: number,
  +platformDetails: PlatformDetails,
}>;

const commonNativeNotifInputDataValidator = tShape<CommonNativeNotifInputData>({
  senderDeviceID: senderDeviceIDValidator,
  notifTexts: resolvedNotifTextsValidator,
  newRawMessageInfos: t.list(rawMessageInfoValidator),
  threadID: tID,
  collapseKey: t.maybe(t.String),
  unreadCount: t.Number,
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
    senderDeviceID,
    notifTexts,
    newRawMessageInfos,
    threadID,
    collapseKey,
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
      badge: unreadCount.toString(),
      ...rest,
      threadID,
    },
  };

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
    badgeOnly: '0',
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

    return devices.map(({ deviceToken }) => ({
      priority,
      notification: notificationToSend,
      deviceToken,
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
      senderDeviceID,
      devices,
      copyWithMessageInfos,
      notificationsSizeValidator,
    );

  const devicesWithExcessiveSizeNoHolders = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => payloadSizeExceeded)
    .map(({ cookieID, deviceToken }) => ({ cookieID, deviceToken }));

  if (devicesWithExcessiveSizeNoHolders.length === 0) {
    return notifsWithMessageInfos.map(
      ({ notification: notif, deviceToken, encryptionOrder }) => ({
        priority,
        notification: notif,
        deviceToken,
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
      senderDeviceID,
      devicesWithExcessiveSize,
      notification,
    );

  const targetedNotifsWithMessageInfos = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => !payloadSizeExceeded)
    .map(({ notification: notif, deviceToken, encryptionOrder }) => ({
      priority,
      notification: notif,
      deviceToken,
      encryptionOrder,
    }));

  const targetedNotifsWithoutMessageInfos = notifsWithoutMessageInfos.map(
    ({ notification: notif, deviceToken, encryptionOrder }) => ({
      priority,
      notification: notif,
      deviceToken,
      encryptionOrder,
    }),
  );

  return [
    ...targetedNotifsWithMessageInfos,
    ...targetedNotifsWithoutMessageInfos,
  ];
}

export type WebNotifInputData = {
  +id: string,
  +notifTexts: ResolvedNotifTexts,
  +threadID: string,
  +senderDeviceID: SenderDeviceID,
  +unreadCount: number,
  +platformDetails: PlatformDetails,
};

export const webNotifInputDataValidator: TInterface<WebNotifInputData> =
  tShape<WebNotifInputData>({
    id: t.String,
    notifTexts: resolvedNotifTextsValidator,
    threadID: tID,
    senderDeviceID: senderDeviceIDValidator,
    unreadCount: t.Number,
    platformDetails: tPlatformDetails,
  });

async function createWebNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: WebNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedWebNotification>> {
  const { id, notifTexts, threadID, unreadCount, senderDeviceID } = inputData;

  const { merged, ...rest } = notifTexts;
  const notification = {
    ...rest,
    unreadCount,
    id,
    threadID,
  };

  const shouldBeEncrypted = hasMinCodeVersion(inputData.platformDetails, {
    web: 43,
  });

  if (!shouldBeEncrypted) {
    return devices.map(({ deviceToken }) => ({ deviceToken, notification }));
  }

  return prepareEncryptedWebNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceID,
    devices,
    notification,
  );
}

export type WNSNotifInputData = {
  +notifTexts: ResolvedNotifTexts,
  +threadID: string,
  +senderDeviceID: SenderDeviceID,
  +unreadCount: number,
  +platformDetails: PlatformDetails,
};

export const wnsNotifInputDataValidator: TInterface<WNSNotifInputData> =
  tShape<WNSNotifInputData>({
    notifTexts: resolvedNotifTextsValidator,
    threadID: tID,
    senderDeviceID: senderDeviceIDValidator,
    unreadCount: t.Number,
    platformDetails: tPlatformDetails,
  });

async function createWNSNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: WNSNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedWNSNotification>> {
  const { notifTexts, threadID, unreadCount, senderDeviceID } = inputData;
  const { merged, ...rest } = notifTexts;
  const notification = {
    ...rest,
    unreadCount,
    threadID,
  };

  if (
    encryptedNotifUtilsAPI.getNotifByteSize(JSON.stringify(notification)) >
    wnsMaxNotificationPayloadByteSize
  ) {
    console.warn('WNS notification exceeds size limit');
  }

  const shouldBeEncrypted = hasMinCodeVersion(inputData.platformDetails, {
    majorDesktop: 10,
  });

  if (!shouldBeEncrypted) {
    return devices.map(({ deviceToken }) => ({
      deviceToken,
      notification,
    }));
  }
  return await prepareEncryptedWNSNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceID,
    devices,
    notification,
  );
}

export {
  createAndroidVisualNotification,
  createWebNotification,
  createWNSNotification,
};
