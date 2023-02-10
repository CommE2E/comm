// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type RemoveMembersMessageData = {
  type: 5,
  threadID: string,
  creatorID: string,
  time: number,
  removedUserIDs: string[],
};

export type RawRemoveMembersMessageInfo = {
  ...RemoveMembersMessageData,
  id: string,
};

export type RemoveMembersMessageInfo = {
  type: 5,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  removedMembers: RelativeUserInfo[],
};
