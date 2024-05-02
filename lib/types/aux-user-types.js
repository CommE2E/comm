// @flow

import type {
  FarcasterUser,
  RawDeviceList,
  UsersRawDeviceLists,
} from './identity-service-types.js';

export type AuxUserInfo = { +fid: ?string, deviceList?: RawDeviceList };

export type AuxUserInfos = { +[userID: string]: AuxUserInfo };

export type AuxUserStore = {
  +auxUserInfos: AuxUserInfos,
};

export type SetAuxUserFIDsPayload = {
  +farcasterUsers: $ReadOnlyArray<FarcasterUser>,
};

export type SetPeerDeviceListsPayload = {
  +deviceLists: UsersRawDeviceLists,
};
