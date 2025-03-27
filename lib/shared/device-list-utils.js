// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from './identity-client-context.js';
import {
  useBroadcastDeviceListUpdates,
  useGetAndUpdateDeviceListsForUsers,
} from '../hooks/peer-list-hooks.js';
import { getForeignPeerDeviceIDs } from '../selectors/user-selectors.js';
import type {
  IdentityServiceClient,
  RawDeviceList,
  SignedDeviceList,
} from '../types/identity-service-types.js';
import { getConfig } from '../utils/config.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
import {
  composeRawDeviceList,
  rawDeviceListFromSignedList,
} from '../utils/device-list-utils.js';
import { useSelector } from '../utils/redux-utils.js';

export type DeviceListVerificationResult =
  | { +valid: true, +deviceList: RawDeviceList }
  | DeviceListVerificationFailure;

type DeviceListVerificationFailure =
  | { +valid: false, +reason: 'empty_device_list_history' }
  | { +valid: false, +reason: 'empty_device_list_update', +timestamp: number }
  | { +valid: false, +reason: 'invalid_timestamp_order', +timestamp: number }
  | {
      +valid: false,
      +reason: 'invalid_cur_primary_signature',
      +timestamp: number,
    }
  | {
      +valid: false,
      +reason: 'invalid_last_primary_signature',
      +timestamp: number,
    };

// Verifies all device list updates for given `userID` since
// last known (and valid) device list. The updates are fetched
// from Identity Service. If `lastKnownDeviceList` is not provided,
// the whole device list history will be verified.
// Returns latest device list from Identity Service.
async function verifyAndGetDeviceList(
  identityClient: IdentityServiceClient,
  userID: string,
  lastKnownDeviceList: ?SignedDeviceList,
): Promise<DeviceListVerificationResult> {
  let since;
  if (lastKnownDeviceList) {
    const rawList = rawDeviceListFromSignedList(lastKnownDeviceList);
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
    const currentPayload = rawDeviceListFromSignedList(deviceList);
    const previousPayload = rawDeviceListFromSignedList(previousDeviceList);

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

  const deviceList = rawDeviceListFromSignedList(previousDeviceList);
  return { valid: true, deviceList };
}

async function createAndSignSingletonDeviceList(
  primaryDeviceID: string,
  keyserverDeviceID?: ?string,
): Promise<SignedDeviceList> {
  const devices = keyserverDeviceID
    ? [primaryDeviceID, keyserverDeviceID]
    : [primaryDeviceID];
  const initialDeviceList = composeRawDeviceList(devices);
  const rawDeviceList = JSON.stringify(initialDeviceList);
  const { olmAPI } = getConfig();
  const curPrimarySignature = await olmAPI.signMessage(rawDeviceList);
  return {
    rawDeviceList,
    curPrimarySignature,
  };
}

async function signDeviceListUpdate(
  deviceListPayload: RawDeviceList,
): Promise<SignedDeviceList> {
  const deviceID = await getContentSigningKey();
  if (deviceListPayload.devices[0] !== deviceID) {
    throw new Error('non-primary device tried to sign device list');
  }

  const { olmAPI } = getConfig();
  const rawDeviceList = JSON.stringify(deviceListPayload);
  const curPrimarySignature = await olmAPI.signMessage(rawDeviceList);
  return {
    rawDeviceList,
    curPrimarySignature,
  };
}

async function fetchLatestDeviceList(
  identityClient: IdentityServiceClient,
  userID: string,
): Promise<RawDeviceList> {
  const deviceLists = await identityClient.getDeviceListHistoryForUser(userID);
  if (deviceLists.length < 1) {
    throw new Error('received empty device list history');
  }

  const lastSignedDeviceList = deviceLists[deviceLists.length - 1];
  return rawDeviceListFromSignedList(lastSignedDeviceList);
}

async function addDeviceToDeviceList(
  identityClient: IdentityServiceClient,
  userID: string,
  newDeviceID: string,
): Promise<?SignedDeviceList> {
  const { updateDeviceList } = identityClient;
  invariant(
    updateDeviceList,
    'updateDeviceList() should be defined on native. ' +
      'Are you calling it on a non-primary device?',
  );

  const { devices } = await fetchLatestDeviceList(identityClient, userID);
  if (devices.includes(newDeviceID)) {
    // the device was already on the device list
    return null;
  }

  const newDeviceList = composeRawDeviceList([...devices, newDeviceID]);
  const signedDeviceList = await signDeviceListUpdate(newDeviceList);
  await updateDeviceList(signedDeviceList);
  return signedDeviceList;
}

async function removeDeviceFromDeviceList(
  identityClient: IdentityServiceClient,
  userID: string,
  deviceIDToRemove: string,
): Promise<?SignedDeviceList> {
  const { updateDeviceList } = identityClient;
  invariant(
    updateDeviceList,
    'updateDeviceList() should be defined on native. ' +
      'Are you calling it on a non-primary device?',
  );

  const { devices } = await fetchLatestDeviceList(identityClient, userID);
  const newDevices = devices.filter(it => it !== deviceIDToRemove);
  if (devices.length === newDevices.length) {
    // the device wasn't on the device list
    return null;
  }

  const newDeviceList = composeRawDeviceList(newDevices);
  const signedDeviceList = await signDeviceListUpdate(newDeviceList);
  await updateDeviceList(signedDeviceList);
  return signedDeviceList;
}

async function replaceDeviceInDeviceList(
  identityClient: IdentityServiceClient,
  userID: string,
  deviceIDToRemove: string,
  newDeviceID: string,
): Promise<?SignedDeviceList> {
  const { updateDeviceList } = identityClient;
  invariant(
    updateDeviceList,
    'updateDeviceList() should be defined on native. ' +
      'Are you calling it on a non-primary device?',
  );

  const { devices } = await fetchLatestDeviceList(identityClient, userID);

  // If the device to remove is not on the list and the new device is already on
  // the list, return
  if (!devices.includes(deviceIDToRemove) && devices.includes(newDeviceID)) {
    return null;
  }

  const newDevices = devices.filter(it => it !== deviceIDToRemove);
  newDevices.push(newDeviceID);

  const newDeviceList = composeRawDeviceList(newDevices);
  const signedDeviceList = await signDeviceListUpdate(newDeviceList);
  await updateDeviceList(signedDeviceList);
  return signedDeviceList;
}

type DeviceListUpdate =
  | {
      +type: 'add',
      +deviceID: string,
    }
  | {
      +type: 'replace',
      +deviceIDToRemove: string,
      +newDeviceID: string,
    }
  | {
      +type: 'remove',
      +deviceID: string,
    };

function useDeviceListUpdate(): (update: DeviceListUpdate) => Promise<void> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');
  const { identityClient, getAuthMetadata } = identityContext;

  const foreignPeerDevices = useSelector(getForeignPeerDeviceIDs);
  const broadcastDeviceListUpdates = useBroadcastDeviceListUpdates();
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();

  const sendDeviceListUpdates = React.useCallback(
    async (
      signedDeviceList: ?SignedDeviceList,
      userID: string,
      primaryDeviceID: string,
    ) => {
      if (!signedDeviceList) {
        return;
      }

      const deviceList = rawDeviceListFromSignedList(signedDeviceList);
      const ownOtherDevices = deviceList.devices.filter(
        it => it !== primaryDeviceID,
      );

      await Promise.all([
        broadcastDeviceListUpdates(
          [...ownOtherDevices, ...foreignPeerDevices],
          signedDeviceList,
        ),
        // We need to call it in order to fetch platform details for
        // the added device
        getAndUpdateDeviceListsForUsers([userID]),
      ]);
    },
    [
      broadcastDeviceListUpdates,
      foreignPeerDevices,
      getAndUpdateDeviceListsForUsers,
    ],
  );

  return React.useCallback(
    async (update: DeviceListUpdate) => {
      const { userID, deviceID: primaryDeviceID } = await getAuthMetadata();
      if (!userID || !primaryDeviceID) {
        throw new Error('missing auth metadata');
      }

      let signedDeviceList: ?SignedDeviceList;
      if (update.type === 'add') {
        const { deviceID } = update;
        signedDeviceList = await addDeviceToDeviceList(
          identityClient,
          userID,
          deviceID,
        );
      } else if (update.type === 'replace') {
        const { deviceIDToRemove, newDeviceID } = update;
        signedDeviceList = await replaceDeviceInDeviceList(
          identityClient,
          userID,
          deviceIDToRemove,
          newDeviceID,
        );
      } else if (update.type === 'remove') {
        const { deviceID } = update;
        signedDeviceList = await removeDeviceFromDeviceList(
          identityClient,
          userID,
          deviceID,
        );
      }

      await sendDeviceListUpdates(signedDeviceList, userID, primaryDeviceID);
    },
    [getAuthMetadata, identityClient, sendDeviceListUpdates],
  );
}

export {
  verifyAndGetDeviceList,
  createAndSignSingletonDeviceList,
  fetchLatestDeviceList,
  addDeviceToDeviceList,
  removeDeviceFromDeviceList,
  replaceDeviceInDeviceList,
  signDeviceListUpdate,
  useDeviceListUpdate,
};
