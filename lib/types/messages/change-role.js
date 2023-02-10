// @flow

import type { RelativeUserInfo } from '../user-types.js';

export type ChangeRoleMessageData = {
  type: 6,
  threadID: string,
  creatorID: string,
  time: number,
  userIDs: string[],
  newRole: string,
};

export type RawChangeRoleMessageInfo = {
  ...ChangeRoleMessageData,
  id: string,
};

export type ChangeRoleMessageInfo = {
  type: 6,
  id: string,
  threadID: string,
  creator: RelativeUserInfo,
  time: number,
  members: RelativeUserInfo[],
  newRole: string,
};
