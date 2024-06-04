// @flow

import type {
  FarcasterUser,
  RawDeviceList,
  UsersRawDeviceLists,
  IdentityPlatformDetails,
} from './identity-service-types.js';

export type AuxUserInfo = {
  +fid: ?string,
  +deviceList?: RawDeviceList,
  +platformDetails?: IdentityPlatformDetails,
};

export type AuxUserInfos = { +[userID: string]: AuxUserInfo };

export type AuxUserStore = {
  +auxUserInfos: AuxUserInfos,
};

export type SetAuxUserFIDsPayload = {
  +farcasterUsers: $ReadOnlyArray<FarcasterUser>,
};

export type AddAuxUserFIDsPayload = {
  +farcasterUsers: $ReadOnlyArray<FarcasterUser>,
};

export type SetPeerDeviceListsPayload = {
  +deviceLists: UsersRawDeviceLists,
  +usersPlatformDetails: { +[userID: string]: IdentityPlatformDetails },
};
