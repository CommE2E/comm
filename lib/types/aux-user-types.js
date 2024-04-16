// @flow

import type { FarcasterUser } from './identity-service-types';

export type AuxUserInfo = { +fid: ?string };

export type AuxUserInfos = { +[userID: string]: AuxUserInfo };

export type AuxUserStore = {
  +auxUserInfos: AuxUserInfos,
};

export type SetFarcasterFriendsFIDPayload = {
  +farcasterUsers: $ReadOnlyArray<FarcasterUser>,
};
