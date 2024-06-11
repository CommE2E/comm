// @flow

import t, { type TInterface } from 'tcomb';

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
  +type?: '0' | '1',
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
  +type?: '0' | '1',
}>;

export type WNSNotification =
  | PlainTextWNSNotification
  | EncryptedWNSNotification;

export type AndroidVisualNotificationPayloadBase = $ReadOnly<{
  +badge: string,
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
  +type?: '0' | '1',
};

type EncryptedThickThreadPayload = {
  +senderDeviceID: string,
  +encryptedPayload: string,
  +type?: '0' | '1',
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

export type AndroidNotificationRescind = {
  +data: $ReadOnly<{
    ...
      | {
          +badge: string,
          +rescind: 'true',
          +rescindID: string,
          +setUnreadStatus: 'true',
          +threadID: string,
          +encryptionFailed?: string,
        }
      | EncryptedThinThreadPayload
      | EncryptedThickThreadPayload,
  }>,
};

export type AndroidBadgeOnlyNotification = {
  +data: $ReadOnly<{
    ...
      | {
          +badge: string,
          +badgeOnly: '1',
          +encryptionFailed?: string,
        }
      | EncryptedThinThreadPayload
      | EncryptedThickThreadPayload,
  }>,
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
  +deviceToken: string,
  +encryptionOrder?: number,
}>;

export type TargetedWebNotification = {
  +notification: WebNotification,
  +deviceToken: string,
  +encryptionOrder?: number,
};

export type TargetedWNSNotification = {
  +notification: WNSNotification,
  +deviceToken: string,
  +encryptionOrder?: number,
};

export type NotificationTargetDevice = {
  +cookieID: string,
  +deviceToken: string,
  +blobHolder?: string,
};
