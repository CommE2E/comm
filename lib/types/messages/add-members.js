// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type AddMembersMessageData = {
  type: 2,
  threadID: string,
  creatorID: string,
  time: number,
  addedUserIDs: string[],
};

export type RawAddMembersMessageInfo = {
  ...AddMembersMessageData,
  id: string,
};

export type AddMembersMessageInfo = {
  type: 2,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  addedMembers: RelativeUserInfo[],
};
