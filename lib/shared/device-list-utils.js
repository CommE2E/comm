// @flow

import type {
  IdentityServiceClient,
  RawDeviceList,
  SignedDeviceList,
} from '../types/identity-service-types.js';
import { getConfig } from '../utils/config.js';

export type DeviceListVerificationResult =
  | { valid: true }
  | DeviceListVerificationFailure;

type DeviceListVerificationFailure =
  | { valid: false, reason: 'empty_device_list_history' }
  | { valid: false, reason: 'empty_device_list_update', timestamp: number }
  | { valid: false, reason: 'invalid_timestamp_order', timestamp: number }
  | { valid: false, reason: 'invalid_cur_primary_signature', timestamp: number }
  | {
      valid: false,
      reason: 'invalid_last_primary_signature',
      timestamp: number,
    };

// Verifies all device list updates for given `userID` since
// last known (and valid) device list. The updates are fetched
// from Identity Service. If `lastKnownDeviceList` is not provided,
// the whole device list history will be verified.
async function verifyDeviceListUpdates(
  identityClient: IdentityServiceClient,
  userID: string,
  lastKnownDeviceList: ?SignedDeviceList,
): Promise<DeviceListVerificationResult> {
  let since;
  if (lastKnownDeviceList) {
    const rawList: RawDeviceList = JSON.parse(
      lastKnownDeviceList.rawDeviceList,
    );
    since = rawList.timestamp;
  }

  const history = await identityClient.getDeviceListHistoryForUser(
    userID,
    since,
  );
  if (history.length < 1) {
    return { valid: false, reason: 'empty_device_list_history' };
  }

  const [firstUpdate, ...updates] = history;
  const deviceListUpdates = lastKnownDeviceList ? history : updates;
  let previousDeviceList = lastKnownDeviceList ?? firstUpdate;

  const { olmAPI } = getConfig();
  for (const deviceList of deviceListUpdates) {
    const currentPayload: RawDeviceList = JSON.parse(deviceList.rawDeviceList);
    const previousPayload: RawDeviceList = JSON.parse(
      previousDeviceList.rawDeviceList,
    );

    // verify timestamp order
    const { timestamp } = currentPayload;
    if (previousPayload.timestamp >= timestamp) {
      return {
        valid: false,
        reason: 'invalid_timestamp_order',
        timestamp,
      };
    }

    const currentPrimaryDeviceID = currentPayload.devices[0];
    const previousPrimaryDeviceID = previousPayload.devices[0];
    if (!currentPrimaryDeviceID || !previousPrimaryDeviceID) {
      return { valid: false, reason: 'empty_device_list_update', timestamp };
    }

    // verify signatures
    if (deviceList.curPrimarySignature) {
      // verify signature using previous primary device signature
      const signatureValid = await olmAPI.verifyMessage(
        deviceList.rawDeviceList,
        deviceList.curPrimarySignature,
        currentPrimaryDeviceID,
      );
      if (!signatureValid) {
        return {
          valid: false,
          reason: 'invalid_cur_primary_signature',
          timestamp,
        };
      }
    }
    if (
      currentPrimaryDeviceID !== previousPrimaryDeviceID &&
      deviceList.lastPrimarySignature
    ) {
      // verify signature using previous primary device signature
      const signatureValid = await olmAPI.verifyMessage(
        deviceList.rawDeviceList,
        deviceList.lastPrimarySignature,
        previousPrimaryDeviceID,
      );
      if (!signatureValid) {
        return {
          valid: false,
          reason: 'invalid_last_primary_signature',
          timestamp,
        };
      }
    }

    previousDeviceList = deviceList;
  }

  return { valid: true };
}

export { verifyDeviceListUpdates };
