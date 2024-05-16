// @flow

import { assertWithValidator } from './validation-utils.js';
import type {
  RawDeviceList,
  SignedDeviceList,
  UsersRawDeviceLists,
  UsersSignedDeviceLists,
} from '../types/identity-service-types.js';
import { rawDeviceListValidator } from '../types/identity-service-types.js';

function composeRawDeviceList(devices: $ReadOnlyArray<string>): RawDeviceList {
  return {
    devices,
    timestamp: Date.now(),
  };
}

function convertSignedDeviceListsToRawDeviceLists(
  signedDeviceLists: UsersSignedDeviceLists,
): UsersRawDeviceLists {
  let usersRawDeviceLists: UsersRawDeviceLists = {};
  for (const userID in signedDeviceLists) {
    usersRawDeviceLists = {
      ...usersRawDeviceLists,
      [userID]: rawDeviceListFromSignedList(signedDeviceLists[userID]),
    };
  }
  return usersRawDeviceLists;
}

function rawDeviceListFromSignedList(
  signedDeviceList: SignedDeviceList,
): RawDeviceList {
  return assertWithValidator(
    JSON.parse(signedDeviceList.rawDeviceList),
    rawDeviceListValidator,
  );
}

export {
  convertSignedDeviceListsToRawDeviceLists,
  rawDeviceListFromSignedList,
  composeRawDeviceList,
};
