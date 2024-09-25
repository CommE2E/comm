// @flow

import t, { type TInterface } from 'tcomb';

import { prepareEncryptedWebNotifications } from './crypto.js';
import { hasMinCodeVersion } from '../shared/version-utils.js';
import type { PlatformDetails } from '../types/device-types.js';
import {
  type NotificationTargetDevice,
  type TargetedWebNotification,
  type ResolvedNotifTexts,
  resolvedNotifTextsValidator,
  type SenderDeviceDescriptor,
  senderDeviceDescriptorValidator,
  type EncryptedNotifUtilsAPI,
} from '../types/notif-types.js';
import { tID, tPlatformDetails, tShape } from '../utils/validation-utils.js';

export type WebNotifInputData = {
  +id: string,
  +notifTexts: ResolvedNotifTexts,
  +threadID: string,
  +senderDeviceDescriptor: SenderDeviceDescriptor,
  +unreadCount?: number,
  +platformDetails: PlatformDetails,
};

export const webNotifInputDataValidator: TInterface<WebNotifInputData> =
  tShape<WebNotifInputData>({
    id: t.String,
    notifTexts: resolvedNotifTextsValidator,
    threadID: tID,
    senderDeviceDescriptor: senderDeviceDescriptorValidator,
    unreadCount: t.maybe(t.Number),
    platformDetails: tPlatformDetails,
  });

async function createWebNotification(
  encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  inputData: WebNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<{
  +targetedNotifications: $ReadOnlyArray<TargetedWebNotification>,
}> {
  const { id, notifTexts, threadID, unreadCount, senderDeviceDescriptor } =
    inputData;

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
    return {
      targetedNotifications: devices.map(({ deliveryID }) => ({
        deliveryID,
        notification,
      })),
    };
  }
  const targetedNotifications = await prepareEncryptedWebNotifications(
    encryptedNotifUtilsAPI,
    senderDeviceDescriptor,
    devices,
    notification,
  );
  return { targetedNotifications };
}

export { createWebNotification };
