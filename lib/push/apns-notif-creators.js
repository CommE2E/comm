// @flow

import invariant from 'invariant';
import t, { type TInterface } from 'tcomb';

import {
  type CommonNativeNotifInputData,
  commonNativeNotifInputDataValidator,
} from './android-notif-creators.js';
import {
  prepareEncryptedAPNsVisualNotifications,
  prepareEncryptedAPNsSilentNotifications,
  prepareLargeNotifData,
  type LargeNotifData,
  type LargeNotifEncryptionResult,
  generateBlobHolders,
} from './crypto.js';
import { getAPNsNotificationTopic } from '../shared/notif-utils.js';
import { hasMinCodeVersion } from '../shared/version-utils.js';
import type { PlatformDetails } from '../types/device-types.js';
import { messageTypes } from '../types/message-types-enum.js';
import {
  type NotificationTargetDevice,
  type EncryptedNotifUtilsAPI,
  type TargetedAPNsNotification,
  type APNsVisualNotification,
  type APNsNotificationHeaders,
  type SenderDeviceDescriptor,
} from '../types/notif-types.js';
import { tShape } from '../utils/validation-utils.js';

export const apnMaxNotificationPayloadByteSize = 4096;

export type APNsNotifInputData = $ReadOnly<{
  ...CommonNativeNotifInputData,
  +uniqueID: string,
}>;

export const apnsNotifInputDataValidator: TInterface<APNsNotifInputData> =
  tShape<APNsNotifInputData>({
    ...commonNativeNotifInputDataValidator.meta.props,
    uniqueID: t.String,
  });

async function createAPNsVisualNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: APNsNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  largeNotifToEncryptionResultPromises?: {
    [string]: Promise<LargeNotifEncryptionResult>,
  },
): Promise<{
  +targetedNotifications: $ReadOnlyArray<TargetedAPNsNotification>,
  +largeNotifData?: LargeNotifData,
}> {
  const {
    senderDeviceDescriptor,
    notifTexts,
    newRawMessageInfos,
    threadID,
    collapseKey,
    badgeOnly,
    unreadCount,
    platformDetails,
    uniqueID,
  } = inputData;

  const canDecryptNonCollapsibleTextIOSNotifs = hasMinCodeVersion(
    platformDetails,
    { native: 222 },
  );

  const isNonCollapsibleTextNotification =
    newRawMessageInfos.every(
      newRawMessageInfo => newRawMessageInfo.type === messageTypes.TEXT,
    ) && !collapseKey;

  const canDecryptAllIOSNotifs = hasMinCodeVersion(platformDetails, {
    native: 267,
  });

  const canDecryptIOSNotif =
    platformDetails.platform === 'ios' &&
    (canDecryptAllIOSNotifs ||
      (isNonCollapsibleTextNotification &&
        canDecryptNonCollapsibleTextIOSNotifs));

  const canDecryptMacOSNotifs =
    platformDetails.platform === 'macos' &&
    hasMinCodeVersion(platformDetails, {
      web: 47,
      majorDesktop: 9,
    });

  let apsDictionary = {
    'thread-id': threadID,
  };
  if (unreadCount !== undefined && unreadCount !== null) {
    apsDictionary = {
      ...apsDictionary,
      badge: unreadCount,
    };
  }

  const { merged, ...rest } = notifTexts;
  // We don't include alert's body on macos because we
  // handle displaying the notification ourselves and
  // we don't want macOS to display it automatically.
  if (!badgeOnly && platformDetails.platform !== 'macos') {
    apsDictionary = {
      ...apsDictionary,
      alert: merged,
      sound: 'default',
    };
  }

  if (hasMinCodeVersion(platformDetails, { native: 198 })) {
    apsDictionary = {
      ...apsDictionary,
      'mutable-content': 1,
    };
  }

  let notificationPayload = {
    ...rest,
    id: uniqueID,
    threadID,
  };

  let notificationHeaders: APNsNotificationHeaders = {
    'apns-topic': getAPNsNotificationTopic(platformDetails),
    'apns-id': uniqueID,
    'apns-push-type': 'alert',
  };

  if (collapseKey && (canDecryptAllIOSNotifs || canDecryptMacOSNotifs)) {
    notificationPayload = {
      ...notificationPayload,
      collapseID: collapseKey,
    };
  } else if (collapseKey) {
    notificationHeaders = {
      ...notificationHeaders,
      'apns-collapse-id': collapseKey,
    };
  }

  const notification = {
    ...notificationPayload,
    headers: notificationHeaders,
    aps: apsDictionary,
  };

  const messageInfos = JSON.stringify(newRawMessageInfos);
  const copyWithMessageInfos = {
    ...notification,
    messageInfos,
  };

  const isNotificationSizeValid = (notif: APNsVisualNotification) => {
    const { headers, ...notifSansHeaders } = notif;
    return (
      encryptedNotifUtilsAPI.getNotifByteSize(
        JSON.stringify(notifSansHeaders),
      ) <= apnMaxNotificationPayloadByteSize
    );
  };

  const serializeAPNsNotif = (notif: APNsVisualNotification) => {
    const { headers, ...notifSansHeaders } = notif;
    return JSON.stringify(notifSansHeaders);
  };

  const shouldBeEncrypted = canDecryptIOSNotif || canDecryptMacOSNotifs;
  if (!shouldBeEncrypted) {
    const notificationToSend = isNotificationSizeValid(copyWithMessageInfos)
      ? copyWithMessageInfos
      : notification;
    const targetedNotifications = devices.map(({ deliveryID }) => ({
      notification: notificationToSend,
      deliveryID,
    }));
    return {
      targetedNotifications,
    };
  }

  // The `messageInfos` field in notification payload is
  // not used on MacOS so we can return early.
  if (platformDetails.platform === 'macos') {
    const macOSNotifsWithoutMessageInfos =
      await prepareEncryptedAPNsVisualNotifications(
        encryptedNotifUtilsAPI,
        senderDeviceDescriptor,
        devices,
        notification,
        platformDetails.codeVersion,
      );
    const targetedNotifications = macOSNotifsWithoutMessageInfos.map(
      ({ notification: notif, deliveryID }) => ({
        notification: notif,
        deliveryID,
      }),
    );
    return { targetedNotifications };
  }

  const notifsWithMessageInfos = await prepareEncryptedAPNsVisualNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    devices,
    copyWithMessageInfos,
    platformDetails.codeVersion,
    isNotificationSizeValid,
  );

  const devicesWithExcessiveSizeNoHolders = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => payloadSizeExceeded)
    .map(({ cryptoID, deliveryID }) => ({
      cryptoID,
      deliveryID,
    }));

  if (devicesWithExcessiveSizeNoHolders.length === 0) {
    const targetedNotifications = notifsWithMessageInfos.map(
      ({
        notification: notif,
        deliveryID,
        encryptedPayloadHash,
        encryptionOrder,
      }) => ({
        notification: notif,
        deliveryID,
        encryptedPayloadHash,
        encryptionOrder,
      }),
    );

    return {
      targetedNotifications,
    };
  }

  const canQueryBlobService = hasMinCodeVersion(platformDetails, {
    native: 331,
  });

  let blobHash,
    blobHolders,
    encryptionKey,
    blobUploadError,
    encryptedCopyWithMessageInfos;

  const copyWithMessageInfosBlob = serializeAPNsNotif(copyWithMessageInfos);

  if (
    canQueryBlobService &&
    largeNotifToEncryptionResultPromises &&
    largeNotifToEncryptionResultPromises[copyWithMessageInfosBlob]
  ) {
    const largeNotifData =
      await largeNotifToEncryptionResultPromises[copyWithMessageInfosBlob];
    blobHash = largeNotifData.blobHash;
    encryptionKey = largeNotifData.encryptionKey;
    blobHolders = generateBlobHolders(devicesWithExcessiveSizeNoHolders.length);
    encryptedCopyWithMessageInfos =
      largeNotifData.encryptedCopyWithMessageInfos;
  } else if (canQueryBlobService && largeNotifToEncryptionResultPromises) {
    largeNotifToEncryptionResultPromises[copyWithMessageInfosBlob] =
      prepareLargeNotifData(
        copyWithMessageInfosBlob,

        encryptedNotifUtilsAPI,
      );

    const largeNotifData =
      await largeNotifToEncryptionResultPromises[copyWithMessageInfosBlob];
    blobHash = largeNotifData.blobHash;
    encryptionKey = largeNotifData.encryptionKey;
    blobHolders = generateBlobHolders(devicesWithExcessiveSizeNoHolders.length);
    encryptedCopyWithMessageInfos =
      largeNotifData.encryptedCopyWithMessageInfos;
  } else if (canQueryBlobService) {
    ({ blobHash, blobHolders, encryptionKey, blobUploadError } =
      await encryptedNotifUtilsAPI.uploadLargeNotifPayload(
        copyWithMessageInfosBlob,
        devicesWithExcessiveSizeNoHolders.length,
      ));
  }

  if (blobUploadError) {
    console.warn(
      `Failed to upload payload of notification: ${uniqueID} ` +
        `due to error: ${blobUploadError}`,
    );
  }

  let devicesWithExcessiveSize = devicesWithExcessiveSizeNoHolders;
  let notificationWithBlobMetadata = notification;
  if (
    blobHash &&
    encryptionKey &&
    blobHolders &&
    blobHolders.length === devicesWithExcessiveSize.length
  ) {
    notificationWithBlobMetadata = {
      ...notification,
      blobHash,
      encryptionKey,
    };
    devicesWithExcessiveSize = blobHolders.map((holder, idx) => ({
      ...devicesWithExcessiveSize[idx],
      blobHolder: holder,
    }));
  }

  const notifsWithoutMessageInfos =
    await prepareEncryptedAPNsVisualNotifications(
      encryptedNotifUtilsAPI,
      senderDeviceDescriptor,
      devicesWithExcessiveSize,
      notificationWithBlobMetadata,
      platformDetails.codeVersion,
    );

  const targetedNotifsWithMessageInfos = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => !payloadSizeExceeded)
    .map(
      ({
        notification: notif,
        deliveryID,
        encryptedPayloadHash,
        encryptionOrder,
      }) => ({
        notification: notif,
        deliveryID,
        encryptedPayloadHash,
        encryptionOrder,
      }),
    );

  const targetedNotifsWithoutMessageInfos = notifsWithoutMessageInfos.map(
    ({
      notification: notif,
      deliveryID,
      encryptedPayloadHash,
      encryptionOrder,
    }) => ({
      notification: notif,
      deliveryID,
      encryptedPayloadHash,
      encryptionOrder,
    }),
  );
  const targetedNotifications = [
    ...targetedNotifsWithMessageInfos,
    ...targetedNotifsWithoutMessageInfos,
  ];
  if (
    !encryptedCopyWithMessageInfos ||
    !blobHolders ||
    !blobHash ||
    !encryptionKey
  ) {
    return { targetedNotifications };
  }
  return {
    targetedNotifications,
    largeNotifData: {
      blobHash,
      blobHolders,
      encryptionKey,
      encryptedCopyWithMessageInfos,
    },
  };
}

type APNsNotificationRescindInputData = {
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +rescindID?: string,
  +badge?: number,
  +threadID: string,
  +platformDetails: PlatformDetails,
};

async function createAPNsNotificationRescind(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: APNsNotificationRescindInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<{
  +targetedNotifications: $ReadOnlyArray<TargetedAPNsNotification>,
}> {
  const {
    badge,
    rescindID,
    threadID,
    platformDetails,
    senderDeviceDescriptor,
  } = inputData;

  const apnsTopic = getAPNsNotificationTopic(platformDetails);
  let notification;

  if (
    rescindID &&
    badge !== null &&
    badge !== undefined &&
    hasMinCodeVersion(platformDetails, { native: 198 })
  ) {
    notification = {
      headers: {
        'apns-topic': apnsTopic,
        'apns-push-type': 'alert',
      },
      aps: {
        'mutable-content': 1,
        'badge': badge,
      },
      threadID,
      notificationId: rescindID,
      backgroundNotifType: 'CLEAR',
      setUnreadStatus: true,
    };
  } else if (rescindID && badge !== null && badge !== undefined) {
    notification = {
      headers: {
        'apns-topic': apnsTopic,
        'apns-push-type': 'background',
        'apns-priority': 5,
      },
      aps: {
        'mutable-content': 1,
        'badge': badge,
      },
      threadID,
      notificationId: rescindID,
      backgroundNotifType: 'CLEAR',
      setUnreadStatus: true,
    };
  } else {
    notification = {
      headers: {
        'apns-topic': apnsTopic,
        'apns-push-type': 'alert',
      },
      aps: {
        'mutable-content': 1,
      },
      threadID,
      backgroundNotifType: 'CLEAR',
      setUnreadStatus: true,
    };
  }

  const shouldBeEncrypted = hasMinCodeVersion(platformDetails, { native: 233 });
  if (!shouldBeEncrypted) {
    return {
      targetedNotifications: devices.map(({ deliveryID }) => ({
        notification,
        deliveryID,
      })),
    };
  }

  const notifications = await prepareEncryptedAPNsSilentNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    devices,
    notification,
    platformDetails.codeVersion,
  );

  return {
    targetedNotifications: notifications.map(
      ({ deliveryID, notification: notif }) => ({
        deliveryID,
        notification: notif,
      }),
    ),
  };
}

type SenderDescriptorWithPlatformDetails = {
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +platformDetails: PlatformDetails,
};

type APNsBadgeOnlyNotificationInputData = $ReadOnly<
  | {
      ...SenderDescriptorWithPlatformDetails,
      +badge: string,
    }
  | { ...SenderDescriptorWithPlatformDetails, +threadID: string },
>;

async function createAPNsBadgeOnlyNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: APNsBadgeOnlyNotificationInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<{
  +targetedNotifications: $ReadOnlyArray<TargetedAPNsNotification>,
  +largeNotifData?: LargeNotifData,
}> {
  const { senderDeviceDescriptor, platformDetails, threadID, badge } =
    inputData;

  const shouldBeEncrypted = hasMinCodeVersion(platformDetails, {
    native: 222,
    web: 47,
    majorDesktop: 9,
  });

  const headers: APNsNotificationHeaders = {
    'apns-topic': getAPNsNotificationTopic(platformDetails),
    'apns-push-type': 'alert',
  };

  let notification;
  if (shouldBeEncrypted && threadID) {
    notification = {
      headers,
      threadID,
      aps: {
        'mutable-content': 1,
      },
    };
  } else if (shouldBeEncrypted && badge !== undefined && badge !== null) {
    notification = {
      headers,
      aps: {
        'badge': badge,
        'mutable-content': 1,
      },
    };
  } else {
    invariant(
      badge !== null && badge !== undefined,
      'badge update must contain either badge count or threadID',
    );
    notification = {
      headers,
      aps: {
        badge,
      },
    };
  }

  if (!shouldBeEncrypted) {
    return {
      targetedNotifications: devices.map(({ deliveryID }) => ({
        deliveryID,
        notification,
      })),
    };
  }

  const notifications = await prepareEncryptedAPNsSilentNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    devices,
    notification,
    platformDetails.codeVersion,
  );

  return {
    targetedNotifications: notifications.map(
      ({ deliveryID, notification: notif }) => ({
        deliveryID,
        notification: notif,
      }),
    ),
  };
}

export {
  createAPNsBadgeOnlyNotification,
  createAPNsNotificationRescind,
  createAPNsVisualNotification,
};
