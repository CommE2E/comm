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

export type SenderDeviceID =
  | { +keyserverID: string }
  | { +senderDeviceID: string };

export const senderDeviceIDValidator: TUnion<SenderDeviceID> = t.union([
  tShape({ keyserverID: t.String }),
  tShape({ senderDeviceID: t.String }),
]);

// Web notifs types
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
  ...SenderDeviceID,
  +id: string,
  +encryptedPayload: string,
}>;

export type WebNotification =
  | PlainTextWebNotification
  | EncryptedWebNotification;

// WNS notifs types
export type PlainTextWNSNotification = {
  +body: string,
  +prefix?: string,
  +title: string,
  +unreadCount: number,
  +threadID: string,
  +encryptionFailed?: '1',
};

export type EncryptedWNSNotification = $ReadOnly<{
  ...SenderDeviceID,
  +encryptedPayload: string,
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
    ...
      | {
          +badge?: string,
          +body: string,
          +title: string,
          +prefix?: string,
          +threadID: string,
          +collapseID?: string,
          +badgeOnly?: '0',
          +encryptionFailed?: '1',
          +messageInfos?: string,
        }
      | {
          +badge?: string,
          +body: string,
          +title: string,
          +prefix?: string,
          +threadID: string,
          +collapseID?: string,
          +badgeOnly?: '0',
          +encryptionFailed?: '1',
          +blobHash: string,
          +encryptionKey: string,
        }
      | {
          +keyserverID: string,
          +encryptedPayload: string,
        }
      | { +senderDeviceID: string, +encryptedPayload: string },
  }>,
};

export type AndroidNotificationRescind = {
  +data: $ReadOnly<{
    ...
      | {
          +badge: string,
          +rescind: 'true',
          +rescindID?: string,
          +setUnreadStatus: 'true',
          +threadID: string,
          +encryptionFailed?: string,
        }
      | {
          +rescind: 'true',
          +setUnreadStatus: 'true',
          +threadID: string,
          +encryptionFailed?: string,
        }
      | {
          +keyserverID: string,
          +encryptedPayload: string,
        }
      | { +senderDeviceID: string, +encryptedPayload: string },
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
      | {
          +threadID: string,
          +badgeOnly: '1',
          +encryptionFailed?: string,
        }
      | {
          +keyserverID: string,
          +encryptedPayload: string,
        }
      | { +senderDeviceID: string, +encryptedPayload: string },
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

export type EncryptedAPNsSilentNotification = $ReadOnly<{
  ...SenderDeviceID,
  +headers: APNsNotificationHeaders,
  +encryptedPayload: string,
  +aps: { +'mutable-content': number, +'alert'?: { body: 'ENCRYPTED' } },
}>;

export type EncryptedAPNsVisualNotification = $ReadOnly<{
  ...EncryptedAPNsSilentNotification,
  +id: string,
}>;

export type APNsVisualNotification =
  | $ReadOnly<{
      +headers: APNsNotificationHeaders,
      +id: string,
      +aps: {
        +'badge'?: string | number,
        +'alert'?: string | { +body?: string, ... },
        +'thread-id': string,
        +'mutable-content'?: number,
        +'sound'?: string,
      },
      ...
        | {
            +body: string,
            +title: string,
            +prefix?: string,
            +threadID: string,
            +collapseKey?: string,
            +encryptionFailed?: '1',
            +messageInfos?: string,
          }
        | {
            +body: string,
            +title: string,
            +prefix?: string,
            +threadID: string,
            +collapseKey?: string,
            +encryptionFailed?: '1',
            +blobHash: string,
            +encryptionKey: string,
          },
    }>
  | EncryptedAPNsVisualNotification;

export type APNsNotificationRescind =
  | $ReadOnly<{
      +headers: APNsNotificationHeaders,
      +encryptionFailed?: '1',
      ...
        | {
            +backgroundNotifType: 'CLEAR',
            +notificationId: string,
            +setUnreadStatus: true,
            +threadID: string,
            +aps: {
              +'badge': string | number,
              +'mutable-content': number,
            },
          }
        | {
            +backgroundNotifType: 'CLEAR',
            +notificationId: string,
            +setUnreadStatus: true,
            +threadID: string,
            +aps: {
              +'badge': string | number,
              +'content-available': number,
            },
          }
        | {
            +backgroundNotifType: 'CLEAR',
            +setUnreadStatus: true,
            +threadID: string,
            +aps: {
              +'mutable-content': number,
            },
          },
    }>
  | EncryptedAPNsSilentNotification;

export type APNsBadgeOnlyNotification =
  | $ReadOnly<{
      +headers: APNsNotificationHeaders,
      +encryptionFailed?: '1',
      ...
        | {
            +aps: {
              +'badge': string | number,
              +'mutable-content': number,
            },
          }
        | {
            +aps: {
              +'mutable-content': number,
            },
            +threadID: string,
          }
        | {
            +aps: {
              +badge: string | number,
            },
          },
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

export type EncryptedNotifUtilsAPI = {
  +encryptSerializedNotifPayload: (
    cryptoID: string,
    unencryptedPayload: string,
    encryptedPayloadSizeValidator?: (encryptedPayload: string) => boolean,
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
  +getEncryptedNotifHash: (serializedNotification: string) => string,
};
