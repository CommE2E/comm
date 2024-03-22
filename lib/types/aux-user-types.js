// @flow

export type AuxUserInfo = { +farcasterID: string };

export type AuxUserInfos = { +[userID: string]: AuxUserInfo };

export type AuxUserStore = {
  +auxUserInfos: AuxUserInfos,
};
