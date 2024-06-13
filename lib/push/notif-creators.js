// @flow
import invariant from 'invariant';
import t, { type TInterface } from 'tcomb';

import {
  prepareEncryptedAPNsVisualNotifications,
  prepareEncryptedAPNsSilentNotifications,
  prepareEncryptedAndroidVisualNotifications,
  prepareEncryptedAndroidSilentNotifications,
  prepareEncryptedWNSNotifications,
  prepareEncryptedWebNotifications,
} from './crypto.js';
import { getAPNsNotificationTopic } from '../shared/notif-utils.js';
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
  type TargetedWebNotification,
  type TargetedWNSNotification,
  type ResolvedNotifTexts,
  resolvedNotifTextsValidator,
  type SenderDeviceID,
  senderDeviceIDValidator,
  type EncryptedNotifUtilsAPI,
  type AndroidBadgeOnlyNotification,
  type TargetedAPNsNotification,
  type APNsVisualNotification,
  type APNsNotificationHeaders,
} from '../types/notif-types.js';
import { tID, tPlatformDetails, tShape } from '../utils/validation-utils.js';

export const apnMaxNotificationPayloadByteSize = 4096;
export const fcmMaxNotificationPayloadByteSize = 4000;
export const wnsMaxNotificationPayloadByteSize = 5000;

type CommonNativeNotifInputData = $ReadOnly<{
  +senderDeviceID: SenderDeviceID,
  +notifTexts: ResolvedNotifTexts,
  +newRawMessageInfos: RawMessageInfo[],
  +threadID: string,
  +collapseKey: ?string,
  +unreadCount?: number,
  +platformDetails: PlatformDetails,
}>;

const commonNativeNotifInputDataValidator = tShape<CommonNativeNotifInputData>({
  senderDeviceID: senderDeviceIDValidator,
  notifTexts: resolvedNotifTextsValidator,
  newRawMessageInfos: t.list(rawMessageInfoValidator),
  threadID: tID,
  collapseKey: t.maybe(t.String),
  unreadCount: t.maybe(t.Number),
  platformDetails: tPlatformDetails,
});

export type APNsNotifInputData = {
  ...CommonNativeNotifInputData,
  +badgeOnly: boolean,
  +uniqueID: string,
};

export const apnsNotifInputDataValidator: TInterface<APNsNotifInputData> =
  tShape<APNsNotifInputData>({
    ...commonNativeNotifInputDataValidator.meta.props,
    badgeOnly: t.Boolean,
    uniqueID: t.String,
  });

async function createAPNsVisualNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: APNsNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAPNsNotification>> {
  const {
    senderDeviceID,
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

  const notificationSizeValidator = (notif: APNsVisualNotification) => {
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
    const notificationToSend = notificationSizeValidator(copyWithMessageInfos)
      ? copyWithMessageInfos
      : notification;
    return devices.map(({ deliveryID }) => ({
      notification: notificationToSend,
      deliveryID,
    }));
  }

  // The `messageInfos` field in notification payload is
  // not used on MacOS so we can return early.
  if (platformDetails.platform === 'macos') {
    const macOSNotifsWithoutMessageInfos =
      await prepareEncryptedAPNsVisualNotifications(
        encryptedNotifUtilsAPI,
        senderDeviceID,
        devices,
        notification,
        platformDetails.codeVersion,
      );
    return macOSNotifsWithoutMessageInfos.map(
      ({ notification: notif, deliveryID }) => ({
        notification: notif,
        deliveryID,
      }),
    );
  }

  const notifsWithMessageInfos = await prepareEncryptedAPNsVisualNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceID,
    devices,
    copyWithMessageInfos,
    platformDetails.codeVersion,
    notificationSizeValidator,
  );

  const devicesWithExcessiveSizeNoHolders = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => payloadSizeExceeded)
    .map(({ cryptoID, deliveryID }) => ({
      cryptoID,
      deliveryID,
    }));

  if (devicesWithExcessiveSizeNoHolders.length === 0) {
    return notifsWithMessageInfos.map(
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
  }

  const canQueryBlobService = hasMinCodeVersion(platformDetails, {
    native: 331,
  });

  let blobHash, blobHolders, encryptionKey, blobUploadError;
  if (canQueryBlobService) {
    ({ blobHash, blobHolders, encryptionKey, blobUploadError } =
      await encryptedNotifUtilsAPI.uploadLargeNotifPayload(
        serializeAPNsNotif(copyWithMessageInfos),
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
      senderDeviceID,
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

  return [
    ...targetedNotifsWithMessageInfos,
    ...targetedNotifsWithoutMessageInfos,
  ];
}

type APNsNotificationRescindInputData = {
  +senderDeviceID: SenderDeviceID,
  +rescindID?: string,
  +badge?: number,
  +threadID: string,
  +platformDetails: PlatformDetails,
};

async function createAPNsNotificationRescind(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: APNsNotificationRescindInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAPNsNotification>> {
  const { badge, rescindID, threadID, platformDetails, senderDeviceID } =
    inputData;

  invariant(
    (rescindID && badge !== null && badge !== undefined) ||
      hasMinCodeVersion(platformDetails, { native: FUTURE_CODE_VERSION }),
    'thick thread rescind not support for this client version',
  );

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
    return devices.map(({ deliveryID }) => ({
      notification,
      deliveryID,
    }));
  }

  const notifications = await prepareEncryptedAPNsSilentNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceID,
    devices,
    notification,
    platformDetails.codeVersion,
  );

  return notifications.map(({ deliveryID, notification: notif }) => ({
    deliveryID,
    notification: notif,
  }));
}

type APNsBadgeOnlyNotificationInputData = {
  +senderDeviceID: SenderDeviceID,
  +badge?: number,
  +threadID?: string,
  +platformDetails: PlatformDetails,
};

async function createAPNsBadgeOnlyNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: APNsBadgeOnlyNotificationInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAPNsNotification>> {
  const { senderDeviceID, platformDetails, threadID, badge } = inputData;
  invariant(
    (!threadID && badge !== undefined && badge !== null) ||
      hasMinCodeVersion(platformDetails, { native: FUTURE_CODE_VERSION }),
    'thick thread badge updates not support for this client version',
  );

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
    return devices.map(({ deliveryID }) => ({
      deliveryID,
      notification,
    }));
  }

  const notifications = await prepareEncryptedAPNsSilentNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceID,
    devices,
    notification,
    platformDetails.codeVersion,
  );

  return notifications.map(({ deliveryID, notification: notif }) => ({
    deliveryID,
    notification: notif,
  }));
}

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
      ...rest,
      threadID,
    },
  };

  if (unreadCount !== undefined && unreadCount !== null) {
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
      senderDeviceID,
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
      senderDeviceID,
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
  +senderDeviceID: SenderDeviceID,
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
  const { senderDeviceID, platformDetails, threadID, rescindID, badge } =
    inputData;

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
    senderDeviceID,
    devices,
    notification,
  );

  return notifications.map(({ deliveryID, notification: notif }) => ({
    deliveryID,
    notification: notif,
    priority: 'normal',
  }));
}

type AndroidBadgeOnlyNotificationInputData = $ReadOnly<{
  +senderDeviceID: SenderDeviceID,
  +platformDetails: PlatformDetails,
  ...
    | {
        +badge: string,
      }
    | { threadID: string },
}>;

async function createAndroidBadgeOnlyNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: AndroidBadgeOnlyNotificationInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAndroidNotification>> {
  const { senderDeviceID, platformDetails, badge, threadID } = inputData;

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
    senderDeviceID,
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
    return devices.map(({ deliveryID }) => ({ deliveryID, notification }));
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
    return devices.map(({ deliveryID }) => ({
      deliveryID,
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
  createAPNsVisualNotification,
  createAPNsNotificationRescind,
  createAPNsBadgeOnlyNotification,
  createAndroidVisualNotification,
  createAndroidNotificationRescind,
  createAndroidBadgeOnlyNotification,
  createWebNotification,
  createWNSNotification,
};
