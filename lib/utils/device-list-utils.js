// @flow

import { assertWithValidator } from './validation-utils.js';
import type {
  UsersRawDeviceLists,
  UsersSignedDeviceLists,
} from '../types/identity-service-types.js';
import { rawDeviceListValidator } from '../types/identity-service-types.js';

function convertSignedDeviceListsToRawDeviceLists(
  signedDeviceLists: UsersSignedDeviceLists,
): UsersRawDeviceLists {
  let usersRawDeviceLists: UsersRawDeviceLists = {};
  for (const userID in signedDeviceLists) {
    usersRawDeviceLists = {
      ...usersRawDeviceLists,
      [userID]: assertWithValidator(
        JSON.parse(signedDeviceLists[userID].rawDeviceList),
        rawDeviceListValidator,
      ),
    };
  }
  return usersRawDeviceLists;
}

export { convertSignedDeviceListsToRawDeviceLists };
