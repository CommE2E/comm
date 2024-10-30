// @flow

import type { EncryptResult } from '@commapp/olm';
import t, { type TInterface, type TUnion } from 'tcomb';

import type { MessageData, RawMessageInfo } from './message-types.js';
import type { ThickRawThreadInfos } from './thread-types.js';
import type { EntityText, ThreadEntity } from '../utils/entity-text.js';
import { tShape } from '../utils/validation-utils.js';

export type NotifTexts = {
  +merged: string | EntityText,
  +body: string | EntityText,
  +title: string | ThreadEntity,
  +prefix?: string | EntityText,
};

export type ResolvedNotifTexts = {
  +merged: string,
  +body: string,
  +title: string,
  +prefix?: string,
};
export const resolvedNotifTextsValidator: TInterface<ResolvedNotifTexts> =
  tShape<ResolvedNotifTexts>({
    merged: t.String,
    body: t.String,
    title: t.String,
    prefix: t.maybe(t.String),
  });

export type NotificationsCreationData =
  | {
      +messageDatasWithMessageInfos: ?$ReadOnlyArray<{
        +messageData: MessageData,
        +rawMessageInfo: RawMessageInfo,
      }>,
      +thickRawThreadInfos: ThickRawThreadInfos,
    }
  | {
      +rescindData: { +threadID: string },
    }
  | { +badgeUpdateData: { +threadID: string } };

export type SenderDeviceDescriptor =
  | { +keyserverID: string }
  | { +senderDeviceID: string };

export const senderDeviceDescriptorValidator: TUnion<SenderDeviceDescriptor> =
  t.union([
    tShape({ keyserverID: t.String }),
    tShape({ senderDeviceID: t.String }),
  ]);

// Web notifs types
export type PlainTextWebNotificationPayload = {
  +body: string,
  +prefix?: string,
  +title: string,
  +unreadCount?: number,
  +threadID: string,
  +encryptionFailed?: '1',
};

export type PlainTextWebNotification = $ReadOnly<{
  +id: string,
  ...PlainTextWebNotificationPayload,
}>;

export type EncryptedWebNotification = $ReadOnly<{
  ...SenderDeviceDescriptor,
  +id: string,
  +encryptedPayload: string,
  +type: '0' | '1',
}>;

export type WebNotification =
  | PlainTextWebNotification
  | EncryptedWebNotification;

// WNS notifs types
export type PlainTextWNSNotification = {
  +body: string,
  +prefix?: string,
  +title: string,
  +unreadCount?: number,
  +threadID: string,
  +encryptionFailed?: '1',
};

export type EncryptedWNSNotification = $ReadOnly<{
  ...SenderDeviceDescriptor,
  +encryptedPayload: string,
  +type: '0' | '1',
}>;

export type WNSNotification =
  | PlainTextWNSNotification
  | EncryptedWNSNotification;

// Android notifs types
export type AndroidVisualNotificationPayloadBase = $ReadOnly<{
  +badge?: string,
  +body: string,
  +title: string,
  +prefix?: string,
  +threadID: string,
  +collapseID?: string,
  +badgeOnly?: '0' | '1',
  +encryptionFailed?: '1',
}>;

type AndroidSmallVisualNotificationPayload = $ReadOnly<{
  ...AndroidVisualNotificationPayloadBase,
  +messageInfos?: string,
}>;

type AndroidLargeVisualNotificationPayload = $ReadOnly<{
  ...AndroidVisualNotificationPayloadBase,
  +blobHash: string,
  +encryptionKey: string,
}>;

export type AndroidVisualNotificationPayload =
  | AndroidSmallVisualNotificationPayload
  | AndroidLargeVisualNotificationPayload;

type EncryptedThinThreadPayload = {
  +keyserverID: string,
  +encryptedPayload: string,
  +type: '0' | '1',
};

type EncryptedThickThreadPayload = {
  +senderDeviceID: string,
  +encryptedPayload: string,
  +type: '0' | '1',
};

export type AndroidVisualNotification = {
  +data: $ReadOnly<{
    +id?: string,
    ...
      | AndroidSmallVisualNotificationPayload
      | AndroidLargeVisualNotificationPayload
      | EncryptedThinThreadPayload
      | EncryptedThickThreadPayload,
  }>,
};

type AndroidThinThreadRescindPayload = {
  +badge: string,
  +rescind: 'true',
  +rescindID?: string,
  +setUnreadStatus: 'true',
  +threadID: string,
  +encryptionFailed?: string,
};

type AndroidThickThreadRescindPayload = {
  +rescind: 'true',
  +setUnreadStatus: 'true',
  +threadID: string,
  +encryptionFailed?: string,
};

export type AndroidNotificationRescind = {
  +data:
    | AndroidThinThreadRescindPayload
    | AndroidThickThreadRescindPayload
    | EncryptedThinThreadPayload
    | EncryptedThickThreadPayload,
};

type AndroidKeyserverBadgeOnlyPayload = {
  +badge: string,
  +badgeOnly: '1',
  +encryptionFailed?: string,
};

type AndroidThickThreadBadgeOnlyPayload = {
  +threadID: string,
  +badgeOnly: '1',
  +encryptionFailed?: string,
};

export type AndroidBadgeOnlyNotification = {
  +data:
    | AndroidKeyserverBadgeOnlyPayload
    | AndroidThickThreadBadgeOnlyPayload
    | EncryptedThinThreadPayload
    | EncryptedThickThreadPayload,
};

type AndroidNotificationWithPriority =
  | {
      +notification: AndroidVisualNotification,
      +priority: 'high',
    }
  | {
      +notification: AndroidBadgeOnlyNotification | AndroidNotificationRescind,
      +priority: 'normal',
    };

// APNs notifs types
export type APNsNotificationTopic =
  | 'app.comm.macos'
  | 'app.comm'
  | 'org.squadcal.app';

export type APNsNotificationHeaders = {
  +'apns-priority'?: 1 | 5 | 10,
  +'apns-id'?: string,
  +'apns-expiration'?: number,
  +'apns-topic': APNsNotificationTopic,
  +'apns-collapse-id'?: string,
  +'apns-push-type': 'background' | 'alert' | 'voip',
};

type EncryptedAPNsSilentNotificationsAps = {
  +'mutable-content': number,
  +'alert'?: { body: 'ENCRYPTED' },
};

export type EncryptedAPNsSilentNotification = $ReadOnly<{
  ...SenderDeviceDescriptor,
  +headers: APNsNotificationHeaders,
  +encryptedPayload: string,
  +type: '1' | '0',
  +aps: EncryptedAPNsSilentNotificationsAps,
}>;

type EncryptedAPNsVisualNotificationAps = $ReadOnly<{
  ...EncryptedAPNsSilentNotificationsAps,
  +sound?: string,
}>;

export type EncryptedAPNsVisualNotification = $ReadOnly<{
  ...EncryptedAPNsSilentNotification,
  +aps: EncryptedAPNsVisualNotificationAps,
  +id: string,
}>;

type APNsVisualNotificationPayloadBase = {
  +aps: {
    +'badge'?: string | number,
    +'alert'?: string | { +body?: string, ... },
    +'thread-id': string,
    +'mutable-content'?: number,
    +'sound'?: string,
  },
  +body: string,
  +title: string,
  +prefix?: string,
  +threadID: string,
  +collapseID?: string,
  +encryptionFailed?: '1',
};

type APNsSmallVisualNotificationPayload = $ReadOnly<{
  ...APNsVisualNotificationPayloadBase,
  +messageInfos?: string,
}>;

type APNsLargeVisualNotificationPayload = $ReadOnly<{
  ...APNsVisualNotificationPayloadBase,
  +blobHash: string,
  +encryptionKey: string,
}>;

export type APNsVisualNotification =
  | $ReadOnly<{
      +headers: APNsNotificationHeaders,
      +id: string,
      ...
        | APNsSmallVisualNotificationPayload
        | APNsLargeVisualNotificationPayload,
    }>
  | EncryptedAPNsVisualNotification;

type APNsLegacyRescindPayload = {
  +backgroundNotifType: 'CLEAR',
  +notificationId: string,
  +setUnreadStatus: true,
  +threadID: string,
  +aps: {
    +'badge': string | number,
    +'content-available': number,
  },
};

type APNsKeyserverRescindPayload = {
  +backgroundNotifType: 'CLEAR',
  +notificationId: string,
  +setUnreadStatus: true,
  +threadID: string,
  +aps: {
    +'badge': string | number,
    +'mutable-content': number,
  },
};

type APNsThickThreadRescindPayload = {
  +backgroundNotifType: 'CLEAR',
  +setUnreadStatus: true,
  +threadID: string,
  +aps: {
    +'mutable-content': number,
  },
};

export type APNsNotificationRescind =
  | $ReadOnly<{
      +headers: APNsNotificationHeaders,
      +encryptionFailed?: '1',
      ...
        | APNsLegacyRescindPayload
        | APNsKeyserverRescindPayload
        | APNsThickThreadRescindPayload,
    }>
  | EncryptedAPNsSilentNotification;

type APNsLegacyBadgeOnlyNotification = {
  +aps: {
    +badge: string | number,
  },
};

type APNsKeyserverBadgeOnlyNotification = {
  +aps: {
    +'badge': string | number,
    +'mutable-content': number,
  },
};

type APNsThickThreadBadgeOnlyNotification = {
  +aps: {
    +'mutable-content': number,
  },
  +threadID: string,
};

export type APNsBadgeOnlyNotification =
  | $ReadOnly<{
      +headers: APNsNotificationHeaders,
      +encryptionFailed?: '1',
      ...
        | APNsLegacyBadgeOnlyNotification
        | APNsKeyserverBadgeOnlyNotification
        | APNsThickThreadBadgeOnlyNotification,
    }>
  | EncryptedAPNsSilentNotification;

export type APNsNotification =
  | APNsVisualNotification
  | APNsNotificationRescind
  | APNsBadgeOnlyNotification;

export type TargetedAPNsNotification = {
  +notification: APNsNotification,
  +deliveryID: string,
  +encryptedPayloadHash?: string,
  +encryptionOrder?: number,
};

export type TargetedAndroidNotification = $ReadOnly<{
  ...AndroidNotificationWithPriority,
  +deliveryID: string,
  +encryptionOrder?: number,
}>;

export type TargetedWebNotification = {
  +notification: WebNotification,
  +deliveryID: string,
  +encryptionOrder?: number,
};

export type TargetedWNSNotification = {
  +notification: WNSNotification,
  +deliveryID: string,
  +encryptionOrder?: number,
};

export type NotificationTargetDevice = {
  +cryptoID: string,
  +deliveryID: string,
  +blobHolder?: string,
};

export type TargetedNotificationWithPlatform =
  | {
      +platform: 'ios' | 'macos',
      +targetedNotification: TargetedAPNsNotification,
    }
  | { +platform: 'android', +targetedNotification: TargetedAndroidNotification }
  | { +platform: 'web', +targetedNotification: TargetedWebNotification }
  | { +platform: 'windows', +targetedNotification: TargetedWNSNotification };

export type EncryptedNotifUtilsAPI = {
  +encryptSerializedNotifPayload: (
    cryptoID: string,
    unencryptedPayload: string,
    encryptedPayloadSizeValidator?: (
      encryptedPayload: string,
      type: '1' | '0',
    ) => boolean,
  ) => Promise<{
    +encryptedData: EncryptResult,
    +sizeLimitViolated?: boolean,
    +encryptionOrder?: number,
  }>,
  +uploadLargeNotifPayload: (
    payload: string,
    numberOfHolders: number,
  ) => Promise<
    | {
        +blobHolders: $ReadOnlyArray<string>,
        +blobHash: string,
        +encryptionKey: string,
      }
    | { +blobUploadError: string },
  >,
  +getNotifByteSize: (serializedNotification: string) => number,
  +getEncryptedNotifHash: (serializedNotification: string) => Promise<string>,
  +getBlobHash: (blob: Uint8Array) => Promise<string>,
  +generateAESKey: () => Promise<string>,
  +encryptWithAESKey: (
    encryptionKey: string,
    unencrypotedData: string,
  ) => Promise<Uint8Array>,
  +normalizeUint8ArrayForBlobUpload: (array: Uint8Array) => string | Blob,
};
