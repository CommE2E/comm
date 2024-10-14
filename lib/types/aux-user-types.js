// @flow

import type {
  FarcasterUser,
  RawDeviceList,
  UsersRawDeviceLists,
  IdentityPlatformDetails,
} from './identity-service-types.js';

type AccountMissingFromIdentityStatus = {
  +missingSince: number,
  +lastChecked: number,
};

export type AuxUserInfo = {
  +fid: ?string,
  +deviceList?: RawDeviceList,
  +devicesPlatformDetails?: { +[deviceID: string]: IdentityPlatformDetails },
  +accountMissingStatus?: AccountMissingFromIdentityStatus,
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

export type RemovePeerUsersPayload = { +userIDs: $ReadOnlyArray<string> };

export type SetPeerDeviceListsPayload = {
  +deviceLists: UsersRawDeviceLists,
  +usersPlatformDetails: {
    +[userID: string]: { +[deviceID: string]: IdentityPlatformDetails },
  },
};
