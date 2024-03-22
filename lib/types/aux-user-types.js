// @flow

import type { FarcasterUser } from './identity-service-types.js';

export type AuxUserInfo = { +farcasterID: string };

export type AuxUserInfos = { +[userID: string]: AuxUserInfo };

export type AuxUserStore = {
  +auxUserInfos: AuxUserInfos,
};

export type SetFarcasterFriendsFIDPayload = {
  +farcasterUsers: $ReadOnlyArray<FarcasterUser>,
};
