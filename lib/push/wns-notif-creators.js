// @flow

import t, { type TInterface } from 'tcomb';

import { prepareEncryptedWNSNotifications } from './crypto.js';
import { hasMinCodeVersion } from '../shared/version-utils.js';
import type { PlatformDetails } from '../types/device-types.js';
import {
  type NotificationTargetDevice,
  type TargetedWNSNotification,
  type ResolvedNotifTexts,
  resolvedNotifTextsValidator,
  type SenderDeviceDescriptor,
  senderDeviceDescriptorValidator,
  type EncryptedNotifUtilsAPI,
} from '../types/notif-types.js';
import { tID, tPlatformDetails, tShape } from '../utils/validation-utils.js';

export const wnsMaxNotificationPayloadByteSize = 5000;

export type WNSNotifInputData = {
  +notifTexts: ResolvedNotifTexts,
  +threadID: string,
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +unreadCount?: number,
  +platformDetails: PlatformDetails,
};

export const wnsNotifInputDataValidator: TInterface<WNSNotifInputData> =
  tShape<WNSNotifInputData>({
    notifTexts: resolvedNotifTextsValidator,
    threadID: tID,
    senderDeviceDescriptor: senderDeviceDescriptorValidator,
    unreadCount: t.maybe(t.Number),
    platformDetails: tPlatformDetails,
  });

async function createWNSNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: WNSNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedWNSNotification>> {
  const { notifTexts, threadID, unreadCount, senderDeviceDescriptor } =
    inputData;
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
    senderDeviceDescriptor,
    devices,
    notification,
  );
}

export { createWNSNotification };
