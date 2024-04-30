// @flow

import type {
  UsersRawDeviceLists,
  UsersSignedDeviceLists,
} from '../types/identity-service-types.js';

function convertSignedDeviceListsToRawDeviceLists(
  signedDeviceLists: UsersSignedDeviceLists,
): UsersRawDeviceLists {
  let usersRawDeviceLists: UsersRawDeviceLists = {};
  for (const userID in signedDeviceLists) {
    usersRawDeviceLists = {
      ...usersRawDeviceLists,
      [userID]: JSON.parse(signedDeviceLists[userID].rawDeviceList),
    };
  }
  return usersRawDeviceLists;
}

export { convertSignedDeviceListsToRawDeviceLists };
