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

export type PlainTextWebNotificationPayload = {
  +body: string,
  +prefix?: string,
  +title: string,
  +unreadCount: number,
  +threadID: string,
  +encryptionFailed?: '1',
};

export type PlainTextWebNotification = {
  +id: string,
  +keyserverID: string,
  ...PlainTextWebNotificationPayload,
};

export type EncryptedWebNotification = {
  +id: string,
  +keyserverID: string,
  +encryptedPayload: string,
};

export type WebNotification =
  | PlainTextWebNotification
  | EncryptedWebNotification;

export type PlainTextWNSNotificationPayload = {
  +body: string,
  +prefix?: string,
  +title: string,
  +unreadCount: number,
  +threadID: string,
  +encryptionFailed?: '1',
};

export type PlainTextWNSNotification = {
  +keyserverID: string,
  ...PlainTextWNSNotificationPayload,
};

export type EncryptedWNSNotification = {
  +keyserverID: string,
  +encryptedPayload: string,
};

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

export type AndroidVisualNotificationPayload = $ReadOnly<
  | {
      ...AndroidVisualNotificationPayloadBase,
      +messageInfos?: string,
    }
  | {
      ...AndroidVisualNotificationPayloadBase,
      +blobHash: string,
      +encryptionKey: string,
    },
>;

export type AndroidVisualNotification = {
  +data: $ReadOnly<{
    +id?: string,
    +keyserverID: string,
    ...
      | {
          ...AndroidVisualNotificationPayloadBase,
          +messageInfos?: string,
        }
      | {
          ...AndroidVisualNotificationPayloadBase,
          +blobHash: string,
          +encryptionKey: string,
        }
      | { +encryptedPayload: string },
  }>,
};

export type AndroidNotificationRescind = {
  +data: $ReadOnly<{
    +keyserverID: string,
    ...
      | {
          +badge: string,
          +rescind: 'true',
          +rescindID: string,
          +setUnreadStatus: 'true',
          +threadID: string,
          +encryptionFailed?: string,
        }
      | { +encryptedPayload: string },
  }>,
};

export type AndroidBadgeOnlyNotification = {
  +data: $ReadOnly<{
    +keyserverID: string,
    ...
      | {
          +badge: string,
          +badgeOnly: '1',
          +encryptionFailed?: string,
        }
      | { +encryptedPayload: string },
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
