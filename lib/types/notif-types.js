// @flow

import type { EncryptResult } from '@commapp/olm';
import t, { type TInterface, type TUnion } from 'tcomb';

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

export type SenderDeviceDescriptor =
  | { +keyserverID: string }
  | { +senderDeviceID: string };

export const senderDeviceDescriptorValidator: TUnion<SenderDeviceDescriptor> =
  t.union([
    tShape({ keyserverID: t.String }),
    tShape({ senderDeviceID: t.String }),
  ]);

export type PlainTextWebNotificationPayload = {
  +body: string,
  +prefix?: string,
  +title: string,
  +unreadCount: number,
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

export type PlainTextWNSNotification = {
  +body: string,
  +prefix?: string,
  +title: string,
  +unreadCount: number,
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

export type AndroidVisualNotificationPayloadBase = $ReadOnly<{
  +badge?: string,
  +body: string,
  +title: string,
  +prefix?: string,
  +threadID: string,
  +collapseKey?: string,
  +badgeOnly?: '0',
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
};
